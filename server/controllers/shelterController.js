import { audit } from "../utils/audit.js"; 
import Shelter from "../models/Shelter.js";
import User from "../models/User.js";
import { notify } from "../utils/notify.js";
import { canRunShelter } from "../utils/access.js";
import { occupancyOf, occupancyMap } from "../utils/shelterStats.js";

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// POST /api/shelters  - a regular user registers a shelter (needs admin approval)
export const registerShelter = async (req, res) => {
  try {
    if (!["adopter", "volunteer"].includes(req.user.role) || req.user.shelter) {
      return res.status(400).json({ message: "Please use a regular (adopter or volunteer) account that is not already part of a shelter" });
    }
    const open = await Shelter.findOne({ owner: req.user._id, status: { $in: ["Pending", "Approved"] } });
    if (open) return res.status(400).json({ message: "You already have a shelter registration" });

    const { name, description, address, city, phone, email, capacity } = req.body;
    const shelter = await Shelter.create({
      name, description, address, city, phone, email,
      capacity: Number(capacity),
      owner: req.user._id,
    });

    const admins = await User.find({ role: "admin" }).select("_id");
    admins.forEach((a) =>
      notify(a._id, {
        type: "system",
        message: `New shelter registration: ${shelter.name} (${shelter.city})`,
        link: "/admin/shelters",
      })
    );
    res.status(201).json(shelter);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// GET /api/shelters?city=  (public) - approved shelters
export const getApprovedShelters = async (req, res) => {
  try {
    const filter = { status: "Approved" };
    if (req.query.city) filter.city = { $regex: escapeRegex(req.query.city), $options: "i" };

    const [shelters, occupied] = await Promise.all([
      Shelter.find(filter).select("name description address city phone email capacity").sort("name"),
      occupancyMap(),
    ]);
    res.json(shelters.map((s) => ({ ...s.toObject(), occupied: occupied.get(s._id.toString()) || 0 })));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/shelters/mine  - my shelter (admins pass ?shelterId=)
export const getMyShelter = async (req, res) => {
  try {
    let shelter = null;
    if (req.user.role === "admin") {
      if (req.query.shelterId) shelter = await Shelter.findById(req.query.shelterId);
    } else if (req.user.shelter) {
      shelter = await Shelter.findById(req.user.shelter);
    } else {
      // an owner whose shelter is still waiting for approval
      shelter = await Shelter.findOne({ owner: req.user._id }).sort({ createdAt: -1 });
    }
    if (!shelter) return res.json(null);

    res.json({ shelter, occupied: await occupancyOf(shelter._id) });
  } catch (error) {
    if (error.name === "CastError") return res.json(null);
    res.status(500).json({ message: error.message });
  }
};

// GET /api/shelters/admin/all?status=Pending  (admin)
export const listAllShelters = async (req, res) => {
  try {
    const filter = req.query.status ? { status: req.query.status } : {};
    const [shelters, occupied] = await Promise.all([
      Shelter.find(filter).sort({ createdAt: -1 }).populate("owner", "name email phone"),
      occupancyMap(),
    ]);
    res.json(shelters.map((s) => ({ ...s.toObject(), occupied: occupied.get(s._id.toString()) || 0 })));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/shelters/:id/review  (admin)  body: { status, reason }
export const reviewShelter = async (req, res) => {
  try {
    const { status, reason } = req.body;
    if (!["Approved", "Rejected"].includes(status)) {
      return res.status(400).json({ message: "Status must be Approved or Rejected" });
    }
    if (status === "Rejected" && !reason?.trim()) {
      return res.status(400).json({ message: "A reason is required when rejecting" });
    }

    const shelter = await Shelter.findById(req.params.id);
    if (!shelter) return res.status(404).json({ message: "Shelter not found" });
    if (shelter.status !== "Pending") {
      return res.status(400).json({ message: `This registration is already ${shelter.status}` });
    }

    shelter.status = status;
    shelter.rejectionReason = status === "Rejected" ? reason : undefined;
    shelter.reviewedBy = req.user._id;
    shelter.reviewedAt = new Date();
    await shelter.save();
        audit(req, `shelter.${status.toLowerCase()}`, {
      targetType: "shelter", targetId: shelter._id,
      summary: `${status} shelter "${shelter.name}"${reason ? `: ${reason}` : ""}`,
    });

    if (status === "Approved") {
      // The owner becomes shelter staff of this shelter
      const owner = await User.findById(shelter.owner).select("role");
      if (owner && ["adopter", "volunteer", "shelter_staff"].includes(owner.role)) {
        await User.updateOne({ _id: owner._id }, { role: "shelter_staff", shelter: shelter._id });
      }
    }

    notify(shelter.owner, {
      type: "system",
      message:
        status === "Approved"
          ? `Your shelter "${shelter.name}" was approved. Log out and log in again to open your staff tools.`
          : `Your shelter registration was not approved: ${reason}`,
      link: "/shelter",
      email: `Your shelter registration was ${status.toLowerCase()}`,
    });
    res.json(shelter);
  } catch (error) {
    if (error.name === "CastError") return res.status(404).json({ message: "Shelter not found" });
    res.status(400).json({ message: error.message });
  }
};

// PUT /api/shelters/:id/staff  (admin)  body: { email }
export const assignStaff = async (req, res) => {
  try {
    const shelter = await Shelter.findById(req.params.id);
    if (!shelter) return res.status(404).json({ message: "Shelter not found" });
    if (shelter.status !== "Approved") {
      return res.status(400).json({ message: "Only approved shelters can have staff" });
    }

    const user = await User.findOne({ email: String(req.body.email || "").toLowerCase().trim() }).select(
      "name role shelter"
    );
    if (!user) return res.status(404).json({ message: "No account found with that email" });
    if (!["adopter", "volunteer", "shelter_staff"].includes(user.role)) {
      return res.status(400).json({ message: "Only adopter, volunteer or staff accounts can be assigned" });
    }
    if (user.shelter && user.shelter.toString() !== shelter._id.toString()) {
      return res.status(400).json({ message: "This person already works for another shelter" });
    }

    await User.updateOne({ _id: user._id }, { role: "shelter_staff", shelter: shelter._id });
        audit(req, "shelter.staff_added", {
      targetType: "shelter", targetId: shelter._id, summary: `${user.name} added as staff of ${shelter.name}`,
    });
    notify(user._id, {
      type: "system",
      message: `You are now staff at ${shelter.name}. Log out and log in again to see your staff tools.`,
      link: "/shelter",
    });
    res.json({ message: `${user.name} is now staff at ${shelter.name}` });
  } catch (error) {
    if (error.name === "CastError") return res.status(404).json({ message: "Shelter not found" });
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/shelters/:id  (staff of this shelter, admin)
export const updateShelter = async (req, res) => {
  try {
    const shelter = await Shelter.findById(req.params.id);
    if (!shelter) return res.status(404).json({ message: "Shelter not found" });
    if (!canRunShelter(req.user, shelter._id)) {
      return res.status(403).json({ message: "You can only change your own shelter" });
    }

    const { description, address, phone, email, capacity } = req.body;
    if (capacity !== undefined) {
      const cap = Number(capacity);
      if (!Number.isInteger(cap) || cap < 1) {
        return res.status(400).json({ message: "Capacity must be a whole number of at least 1" });
      }
      const occupied = await occupancyOf(shelter._id);
      if (cap < occupied) {
        return res.status(400).json({ message: `Capacity cannot be lower than the ${occupied} animals in care` });
      }
      shelter.capacity = cap;
    }
    if (description !== undefined) shelter.description = description;
    if (address !== undefined) shelter.address = address;
    if (phone !== undefined) shelter.phone = phone;
    if (email !== undefined) shelter.email = email;

    await shelter.save(); // status, owner and name are never changed here
    res.json(shelter);
  } catch (error) {
    if (error.name === "CastError") return res.status(404).json({ message: "Shelter not found" });
    res.status(400).json({ message: error.message });
  }
};