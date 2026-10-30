import VolunteerTask from "../models/volunteerTask.js";
import VolunteerProfile from "../models/volunteerProfile.js";
import { notify } from "../utils/notify.js";

const sameId = (a, b) => a && b && a.toString() === b.toString();

// POST /api/tasks  (staff, admin)
export const createTask = async (req, res) => {
  try {
    const { title, type, description, location, startTime, endTime, assigneeId } = req.body;

    const start = new Date(startTime);
    const end = new Date(endTime);
    if (isNaN(start) || isNaN(end)) {
      return res.status(400).json({ message: "A valid start and end time are required" });
    }
    if (end <= start) return res.status(400).json({ message: "End time must be after start time" });
    if (!assigneeId) return res.status(400).json({ message: "Choose a volunteer" });

    const profile = await VolunteerProfile.findOne({ user: assigneeId, verified: true });
    if (!profile) return res.status(400).json({ message: "Choose a verified volunteer" });

    // Two time ranges overlap when each one starts before the other ends
    const clash = await VolunteerTask.findOne({
      assignedTo: assigneeId,
      status: { $in: ["Assigned", "Accepted"] },
      startTime: { $lt: end },
      endTime: { $gt: start },
    });
    if (clash) {
      return res.status(400).json({ message: `This volunteer already has "${clash.title}" at that time` });
    }

    const task = await VolunteerTask.create({
      title, type, description, location,
      startTime: start, endTime: end,
      assignedTo: assigneeId,
      createdBy: req.user._id,
    });

    notify(assigneeId, {
      type: "system",
      message: `New task: ${title} on ${start.toLocaleString()}. Please accept or decline.`,
      link: "/volunteer/tasks",
      email: "New volunteer task",
    });

    res.status(201).json(task);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// GET /api/tasks?from=...&to=...&status=...  (staff, admin)
export const getTasks = async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.from || req.query.to) {
      filter.startTime = {};
      if (req.query.from) filter.startTime.$gte = new Date(req.query.from);
      if (req.query.to) filter.startTime.$lt = new Date(req.query.to);
    }

    const tasks = await VolunteerTask.find(filter)
      .sort({ startTime: 1 })
      .populate("assignedTo", "name phone");
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/tasks/mine  - tasks assigned to me
export const getMyTasks = async (req, res) => {
  try {
    const tasks = await VolunteerTask.find({ assignedTo: req.user._id })
      .sort({ startTime: 1 })
      .populate("createdBy", "name");
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/tasks/:id/respond  body: { action: "accept" | "decline", reason }
export const respondToTask = async (req, res) => {
  try {
    const { action, reason } = req.body;
    const task = await VolunteerTask.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });
    if (!sameId(task.assignedTo, req.user._id)) {
      return res.status(403).json({ message: "This task is not assigned to you" });
    }
    if (task.status !== "Assigned") {
      return res.status(400).json({ message: `This task is already ${task.status}` });
    }

    if (action === "accept") {
      task.status = "Accepted";
    } else if (action === "decline") {
      if (!reason?.trim()) return res.status(400).json({ message: "Please give a reason for declining" });
      task.status = "Declined";
      task.declineReason = reason;
    } else {
      return res.status(400).json({ message: "Action must be accept or decline" });
    }
    await task.save();

    notify(task.createdBy, {
      type: "system",
      message: `${req.user.name} ${task.status.toLowerCase()} "${task.title}"${
        action === "decline" ? `: ${reason}` : ""
      }`,
      link: "/staff/tasks",
    });
    res.json(task);
  } catch (error) {
    if (error.name === "CastError") return res.status(404).json({ message: "Task not found" });
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/tasks/:id/complete  body: { hours, note }
export const completeTask = async (req, res) => {
  try {
    const hours = Number(req.body.hours);
    if (!Number.isFinite(hours) || hours <= 0 || hours > 24) {
      return res.status(400).json({ message: "Enter the hours worked (more than 0, up to 24)" });
    }

    const task = await VolunteerTask.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });
    if (!sameId(task.assignedTo, req.user._id)) {
      return res.status(403).json({ message: "This task is not assigned to you" });
    }
    if (task.status !== "Accepted") {
      return res.status(400).json({ message: "Only accepted tasks can be completed" });
    }

    task.status = "Completed";
    task.hoursLogged = Math.round(hours * 100) / 100;
    task.completionNote = req.body.note;
    task.completedAt = new Date();
    await task.save();

    notify(task.createdBy, {
      type: "system",
      message: `${req.user.name} completed "${task.title}" (${task.hoursLogged} h)`,
      link: "/staff/tasks",
    });
    res.json(task);
  } catch (error) {
    if (error.name === "CastError") return res.status(404).json({ message: "Task not found" });
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/tasks/:id/cancel  (staff, admin)
export const cancelTask = async (req, res) => {
  try {
    const task = await VolunteerTask.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });
    if (!["Assigned", "Accepted"].includes(task.status)) {
      return res.status(400).json({ message: `A ${task.status} task cannot be cancelled` });
    }

    task.status = "Cancelled";
    await task.save();

    notify(task.assignedTo, {
      type: "system",
      message: `The task "${task.title}" was cancelled`,
      link: "/volunteer/tasks",
    });
    res.json(task);
  } catch (error) {
    if (error.name === "CastError") return res.status(404).json({ message: "Task not found" });
    res.status(500).json({ message: error.message });
  }
};