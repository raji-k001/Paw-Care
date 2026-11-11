import ContentFlag from "../models/ContentFlag.js";
import Pet from "../models/Pet.js";
import Campaign from "../models/Campaign.js";
import LostFoundReport from "../models/LostFoundReport.js";
import User from "../models/user.js";
import { notify } from "../utils/notify.js";

const sameId = (a, b) => a && b && a.toString() === b.toString();

// What each kind of listing is called, who owns it, and what "remove" does to it
const TARGETS = {
  pet: {
    Model: Pet, owner: "addedBy", fields: "name addedBy",
    label: (d) => d.name, link: (id) => `/pets/${id}`, remove: { listed: false },
  },
  campaign: {
    Model: Campaign, owner: "createdBy", fields: "title createdBy",
    label: (d) => d.title, link: (id) => `/campaigns/${id}`, remove: { status: "Closed" },
  },
  lostfound: {
    Model: LostFoundReport, owner: "reportedBy", fields: "type species reportedBy",
    label: (d) => `${d.type} ${d.species}`, link: (id) => `/lostfound/${id}`,
    remove: { status: "Closed", hidden: true },
  },
};

// POST /api/flags  body: { targetType, targetId, reason, details }
export const createFlag = async (req, res) => {
  try {
    const { targetType, targetId, reason, details } = req.body;
    const t = TARGETS[targetType];
    if (!t) return res.status(400).json({ message: "Unknown listing type" });

    let target = null;
    try {
      target = await t.Model.findById(targetId).select(t.fields);
    } catch {
      // a badly formed id simply means "not found"
    }
    if (!target) return res.status(404).json({ message: "Listing not found" });
    if (sameId(target[t.owner], req.user._id)) {
      return res.status(400).json({ message: "You cannot report your own listing" });
    }

    try {
      await ContentFlag.create({
        targetType, targetId: target._id, reportedBy: req.user._id, reason, details,
      });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(400).json({ message: "You have already reported this listing" });
      }
      return res.status(400).json({ message: error.message });
    }

    // Tell admins on the first report and again when it reaches three
    const count = await ContentFlag.countDocuments({ targetType, targetId: target._id, status: "Open" });
    if (count === 1 || count === 3) {
      const admins = await User.find({ role: "admin" }).select("_id");
      admins.forEach((a) =>
        notify(a._id, {
          type: "system",
          message: `${count >= 3 ? "Urgent: 3 reports on" : "Listing reported:"} ${targetType} "${t.label(target)}" (${reason.replaceAll("_", " ")})`,
          link: "/admin/reports",
        })
      );
    }
    res.status(201).json({ message: "Thank you. An admin will review your report." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/flags?status=Open  (admin)
export const listFlags = async (req, res) => {
  try {
    const status = ["Open", "Resolved", "Dismissed"].includes(req.query.status) ? req.query.status : "Open";
    const flags = await ContentFlag.find({ status }).sort({ createdAt: -1 }).limit(100).populate("reportedBy", "name email");

    // How many open reports each listing has
    const openCounts = await ContentFlag.aggregate([
      { $match: { status: "Open" } },
      { $group: { _id: { t: "$targetType", id: "$targetId" }, count: { $sum: 1 } } },
    ]);
    const countOf = new Map(openCounts.map((r) => [`${r._id.t}:${r._id.id}`, r.count]));

    // Load every target with one query per type
    const targets = new Map();
    for (const [type, t] of Object.entries(TARGETS)) {
      const ids = flags.filter((f) => f.targetType === type).map((f) => f.targetId);
      if (!ids.length) continue;
      const docs = await t.Model.find({ _id: { $in: ids } }).select(t.fields);
      docs.forEach((d) => targets.set(`${type}:${d._id}`, d));
    }

    res.json(
      flags.map((f) => {
        const key = `${f.targetType}:${f.targetId}`;
        const doc = targets.get(key);
        const t = TARGETS[f.targetType];
        return {
          ...f.toObject(),
          target: { exists: !!doc, label: doc ? t.label(doc) : "(deleted)", link: t.link(f.targetId) },
          openReports: countOf.get(key) || 0,
        };
      })
    );
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/flags/:id/review  body: { action: "remove" | "dismiss", note }  (admin)
export const reviewFlag = async (req, res) => {
  try {
    const { action, note } = req.body;
    if (!["remove", "dismiss"].includes(action)) {
      return res.status(400).json({ message: "Choose remove or dismiss" });
    }
    if (action === "remove" && !note?.trim()) {
      return res.status(400).json({ message: "Add a note explaining why the listing is removed" });
    }

    const flag = await ContentFlag.findById(req.params.id);
    if (!flag) return res.status(404).json({ message: "Report not found" });
    if (flag.status !== "Open") return res.status(400).json({ message: `This report is already ${flag.status}` });

    const t = TARGETS[flag.targetType];
    const review = { reviewNote: note, reviewedBy: req.user._id, reviewedAt: new Date() };

    if (action === "remove") {
      const target = await t.Model.findByIdAndUpdate(flag.targetId, t.remove); // returns the listing as it was
      // Every other open report on the same listing is settled too
      await ContentFlag.updateMany(
        { targetType: flag.targetType, targetId: flag.targetId, status: "Open" },
        { status: "Resolved", ...review }
      );
      if (target) {
        notify(target[t.owner], {
          type: "system",
          message: `Your ${flag.targetType} "${t.label(target)}" was removed after a report: ${note}`,
          link: "/",
          email: "A listing of yours was removed",
        });
      }
    } else {
      Object.assign(flag, { status: "Dismissed", ...review });
      await flag.save();
    }

    notify(flag.reportedBy, {
      type: "system",
      message: `Thank you for your report. We reviewed it and ${action === "remove" ? "removed the listing." : "found no problem."}`,
      link: "/",
    });
    res.json({ message: action === "remove" ? "Listing removed" : "Report dismissed" });
  } catch (error) {
    if (error.name === "CastError") return res.status(404).json({ message: "Report not found" });
    res.status(500).json({ message: error.message });
  }
};