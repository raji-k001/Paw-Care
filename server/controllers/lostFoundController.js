import LostFoundReport from "../models/LostFoundReport.js";
import User from "../models/User.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";
import { notify } from "../utils/notify.js";
import { findMatches, shareWord, EARTH_KM } from "../utils/matching.js";

const DAY = 24 * 60 * 60 * 1000;
const sameId = (a, b) => a && b && a.toString() === b.toString();
const isStaff = (user) => ["shelter_staff", "admin"].includes(user.role);

// The public never sees who posted a report
const publicView = (doc) => {
  const obj = doc.toObject();
  delete obj.reportedBy;
  return obj;
};

// POST /api/lostfound
export const createReport = async (req, res) => {
  try {
    const b = req.body;
    if (!["lost", "found"].includes(b.type)) {
      return res.status(400).json({ message: "Choose lost or found" });
    }

    const latitude = Number(b.lat);
    const longitude = Number(b.lng);
    if (
      b.lat === undefined || b.lat === "" || b.lng === undefined || b.lng === "" ||
      !Number.isFinite(latitude) || !Number.isFinite(longitude) ||
      Math.abs(latitude) > 90 || Math.abs(longitude) > 180
    ) {
      return res.status(400).json({ message: "Please choose the location on the map" });
    }

    const when = b.date ? new Date(b.date) : new Date();
    if (isNaN(when) || when.getTime() > Date.now() + DAY) {
      return res.status(400).json({ message: "Please enter a valid date (not in the future)" });
    }

    const species = String(b.species || "");

    // Duplicate check: the same kind of report, same species and similar colour, within 500 m in the last 3 days
    if (b.confirm !== "true") {
      const nearby = await LostFoundReport.find({
        type: b.type,
        species,
        status: "Open",
        hidden: { $ne: true },
        createdAt: { $gte: new Date(Date.now() - 3 * DAY) },
        location: { $geoWithin: { $centerSphere: [[longitude, latitude], 0.5 / EARTH_KM] } },
      })
        .select("type species color address createdAt")
        .limit(10);

      const duplicates = nearby.filter((r) => shareWord(r.color, b.color)).slice(0, 5);
      if (duplicates.length) {
        return res.status(409).json({ message: "A similar report was posted nearby recently", duplicates });
      }
    }

    const images = await Promise.all(
      (req.files || []).map((f) => uploadToCloudinary(f.buffer, "pawcare/lostfound"))
    );

    const report = await LostFoundReport.create({
      type: b.type,
      reportedBy: req.user._id,
      species,
      name: b.name,
      breed: b.breed,
      color: b.color,
      gender: b.gender || undefined,
      size: b.size || undefined,
      markings: b.markings,
      description: b.description,
      date: when,
      address: b.address,
      images,
      location: { type: "Point", coordinates: [longitude, latitude] },
    });

    // Tell both people about strong matches. This runs in the background and never blocks the response.
    findMatches(report, { limit: 3, minScore: 60 })
      .then((matches) =>
        matches.forEach(({ report: other, score }) => {
          if (sameId(other.reportedBy, req.user._id)) return;
          notify(req.user._id, {
            type: "system",
            message: `Possible match (${score}%): a ${other.type} ${other.species} was reported nearby`,
            link: `/lostfound/${other._id}`,
          });
          notify(other.reportedBy, {
            type: "system",
            message: `A new ${report.type} report may match yours (${score}%)`,
            link: `/lostfound/${report._id}`,
            email: "A possible match for your report",
          });
        })
      )
      .catch(() => {});

    res.status(201).json(publicView(report));
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// GET /api/lostfound?type=lost&species=dog  (public)
export const getReports = async (req, res) => {
  try {
    const filter = { status: "Open", hidden: { $ne: true } };
    if (["lost", "found"].includes(req.query.type)) filter.type = req.query.type;
    if (req.query.species) filter.species = String(req.query.species);

    const reports = await LostFoundReport.find(filter).select("-reportedBy").sort({ createdAt: -1 }).limit(60);
    res.json(reports);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/lostfound/mine
export const getMyReports = async (req, res) => {
  try {
    const reports = await LostFoundReport.find({ reportedBy: req.user._id, hidden: { $ne: true } }).sort({
      createdAt: -1,
    });
    res.json(reports);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/lostfound/:id  (public)
export const getReport = async (req, res) => {
  try {
    const report = await LostFoundReport.findById(req.params.id).select("-reportedBy");
    if (!report || report.hidden) return res.status(404).json({ message: "Report not found" });
    res.json(report);
  } catch (error) {
    if (error.name === "CastError") return res.status(404).json({ message: "Report not found" });
    res.status(500).json({ message: error.message });
  }
};

// GET /api/lostfound/:id/matches  (the owner, or staff)
export const getMatches = async (req, res) => {
  try {
    const report = await LostFoundReport.findById(req.params.id);
    if (!report || report.hidden) return res.status(404).json({ message: "Report not found" });
    if (!sameId(report.reportedBy, req.user._id) && !isStaff(req.user)) {
      return res.status(403).json({ message: "Only the person who posted this report can see its matches" });
    }

    const matches = await findMatches(report, { limit: 5, minScore: 40 });
    res.json(matches.map((m) => ({ ...m, report: publicView(m.report) })));
  } catch (error) {
    if (error.name === "CastError") return res.status(404).json({ message: "Report not found" });
    res.status(500).json({ message: error.message });
  }
};

// POST /api/lostfound/:id/contact  body: { message }
export const contactOwner = async (req, res) => {
  try {
    const message = String(req.body.message || "").trim();
    if (message.length < 5 || message.length > 500) {
      return res.status(400).json({ message: "Write a message of 5 to 500 characters" });
    }

    const report = await LostFoundReport.findById(req.params.id);
    if (!report || report.hidden) return res.status(404).json({ message: "Report not found" });
    if (report.status !== "Open") return res.status(400).json({ message: "This report is no longer open" });
    if (sameId(report.reportedBy, req.user._id)) {
      return res.status(400).json({ message: "This is your own report" });
    }

    // Matches only if this person has not written yet, so one person cannot spam the same owner
    const claim = await LostFoundReport.updateOne(
      { _id: report._id, contactedBy: { $ne: req.user._id } },
      { $addToSet: { contactedBy: req.user._id } }
    );
    if (claim.matchedCount === 0) {
      return res.status(400).json({ message: "You have already sent a message about this report" });
    }

    const sender = await User.findById(req.user._id).select("name email phone");
    notify(report.reportedBy, {
      type: "system",
      message: `${sender.name} wrote about your ${report.type} ${report.species} report: "${message}". Contact: ${sender.email}${sender.phone ? `, ${sender.phone}` : ""}`,
      link: `/lostfound/${report._id}`,
      email: "Someone wrote about your report",
    });
    res.json({ message: "Your message was sent" });
  } catch (error) {
    if (error.name === "CastError") return res.status(404).json({ message: "Report not found" });
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/lostfound/:id/status  body: { status }  (the owner, or an admin)
export const updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!["Open", "Reunited", "Closed"].includes(status)) {
      return res.status(400).json({ message: "Status must be Open, Reunited or Closed" });
    }

    const report = await LostFoundReport.findById(req.params.id);
    if (!report || report.hidden) return res.status(404).json({ message: "Report not found" });
    if (!sameId(report.reportedBy, req.user._id) && req.user.role !== "admin") {
      return res.status(403).json({ message: "Only the person who posted this report can change it" });
    }

    report.status = status;
    await report.save();
    res.json(publicView(report));
  } catch (error) {
    if (error.name === "CastError") return res.status(404).json({ message: "Report not found" });
    res.status(500).json({ message: error.message });
  }
};