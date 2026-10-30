import RescueRequest from "../models/rescueREquest.js";
import User from "../models/User.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";
import { notify, notifyStaff } from "../utils/notify.js";

const isStaff = (user) => ["shelter_staff", "admin"].includes(user.role);
const sameId = (a, b) => a && b && a.toString() === b.toString();

// POST /api/rescues  (any logged-in user)
export const createRescue = async (req, res) => {
  try {
    const { category, species, description, urgency, address, lat, lng } = req.body;

    const hasCoords = lat !== undefined && lat !== "" && lng !== undefined && lng !== "";
    const latitude = Number(lat);
    const longitude = Number(lng);
    if (
      !hasCoords ||
      !Number.isFinite(latitude) || !Number.isFinite(longitude) ||
      Math.abs(latitude) > 90 || Math.abs(longitude) > 180
    ) {
      return res.status(400).json({ message: "Please choose the location on the map" });
    }

    const images = await Promise.all(
      (req.files || []).map((f) => uploadToCloudinary(f.buffer, "pawcare/rescues"))
    );

    const rescue = await RescueRequest.create({
      reportedBy: req.user._id,
      category, species, description, urgency, address, images,
      location: { type: "Point", coordinates: [longitude, latitude] },
      history: [{ status: "Reported", by: req.user._id, note: "Report submitted" }],
    });
    notifyStaff(
  {
    type: "rescue",
    message: `New ${rescue.urgency} rescue report: ${rescue.species} (${rescue.category})`,
    link: `/rescues/${rescue._id}`,
    email: rescue.urgency === "Critical" ? "Critical rescue report" : undefined,
  },
  req.user._id
);

    res.status(201).json(rescue);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// GET /api/rescues?status=Reported&urgency=Critical  (staff, admin)
export const getRescues = async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.urgency) filter.urgency = req.query.urgency;

    const rescues = await RescueRequest.find(filter)
      .sort({ urgencyRank: -1, createdAt: -1 }) // Critical first, then oldest-newest
      .populate("reportedBy", "name")
      .populate("assignedTo", "name");
    res.json(rescues);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/rescues/mine  - reports I submitted
export const getMyReports = async (req, res) => {
  try {
    const rescues = await RescueRequest.find({ reportedBy: req.user._id })
      .sort({ createdAt: -1 })
      .populate("assignedTo", "name");
    res.json(rescues);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/rescues/assigned  - cases assigned to me
export const getAssigned = async (req, res) => {
  try {
    const rescues = await RescueRequest.find({ assignedTo: req.user._id })
      .sort({ urgencyRank: -1, createdAt: -1 })
      .populate("reportedBy", "name");
    res.json(rescues);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/rescues/:id
export const getRescueById = async (req, res) => {
  try {
    const rescue = await RescueRequest.findById(req.params.id)
      .populate("reportedBy", "name email phone")
      .populate("assignedTo", "name role phone")
      .populate("history.by", "name");
    if (!rescue) return res.status(404).json({ message: "Rescue case not found" });

    const allowed =
      isStaff(req.user) ||
      sameId(rescue.reportedBy._id, req.user._id) ||
      sameId(rescue.assignedTo?._id, req.user._id);
    if (!allowed) return res.status(403).json({ message: "Not allowed to view this case" });

    res.json(rescue);
  } catch (error) {
    if (error.name === "CastError") return res.status(404).json({ message: "Rescue case not found" });
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/rescues/:id/assign  (staff, admin)
export const assignRescue = async (req, res) => {
  try {
    const rescue = await RescueRequest.findById(req.params.id);
    if (!rescue) return res.status(404).json({ message: "Rescue case not found" });
    if (rescue.status === "Resolved") {
      return res.status(400).json({ message: "This case is already resolved" });
    }

    const assignee = await User.findById(req.body.assigneeId);
    if (!assignee || !["volunteer", "shelter_staff"].includes(assignee.role)) {
      return res.status(400).json({ message: "Choose a volunteer or shelter staff member" });
    }

    rescue.assignedTo = assignee._id;
    rescue.assignedBy = req.user._id;
    rescue.status = "Assigned";
    rescue.history.push({
      status: "Assigned",
      by: req.user._id,
      note: `Assigned to ${assignee.name}`,
    });

    await rescue.save();
    notify(assignee._id, {
  type: "rescue",
  message: `You have been assigned a ${rescue.urgency} rescue case: ${rescue.species}`,
  link: `/rescues/${rescue._id}`,
  email: "New rescue assignment",
});
if (!sameId(rescue.reportedBy, assignee._id)) {
  notify(rescue.reportedBy, {
    type: "rescue",
    message: `Your rescue report has been assigned to ${assignee.name}`,
    link: `/rescues/${rescue._id}`,
  });
}
    res.json(rescue);
  } catch (error) {
    if (error.name === "CastError") return res.status(400).json({ message: "Invalid id" });
    res.status(400).json({ message: error.message });
  }
};

// The only allowed forward moves
const nextSteps = { Assigned: ["In Progress"], "In Progress": ["Resolved"] };

// PUT /api/rescues/:id/status  (assignee, staff, admin)
export const updateStatus = async (req, res) => {
  try {
    const { status, note } = req.body;
    const rescue = await RescueRequest.findById(req.params.id);
    if (!rescue) return res.status(404).json({ message: "Rescue case not found" });

    const isAssignee = sameId(rescue.assignedTo, req.user._id);
    if (!isStaff(req.user) && !isAssignee) {
      return res.status(403).json({ message: "Only the assigned person or staff can update this case" });
    }

    // Staff may close any open case (for example a false alarm); everyone else follows the steps
    const staffClose = isStaff(req.user) && status === "Resolved" && rescue.status !== "Resolved";
    const allowed = (nextSteps[rescue.status] || []).includes(status);
    if (!allowed && !staffClose) {
      return res.status(400).json({ message: `Cannot move from ${rescue.status} to ${status}` });
    }
    if (status === "Resolved" && !note?.trim()) {
      return res.status(400).json({ message: "Please add a resolution note" });
    }

    rescue.status = status;
    if (status === "Resolved") rescue.resolutionNote = note;
    rescue.history.push({ status, by: req.user._id, note });

    await rescue.save();
    const link = `/rescues/${rescue._id}`;
if (!sameId(rescue.reportedBy, req.user._id)) {
  notify(rescue.reportedBy, {
    type: "rescue",
    message: `Your rescue report is now: ${status}`,
    link,
    email: status === "Resolved" ? "Your rescue report was resolved" : undefined,
  });
}
if (rescue.assignedBy && !sameId(rescue.assignedBy, req.user._id)) {
  notify(rescue.assignedBy, {
    type: "rescue",
    message: `Rescue case (${rescue.species}) moved to ${status}`,
    link,
  });
}
    res.json(rescue);
  } catch (error) {
    if (error.name === "CastError") return res.status(404).json({ message: "Rescue case not found" });
    res.status(400).json({ message: error.message });
  }
};