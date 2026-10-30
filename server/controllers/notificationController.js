import Notification from "../models/notification.js";

// GET /api/notifications  - my latest 30 plus the unread count
export const getMyNotifications = async (req, res) => {
  try {
    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(30),
      Notification.countDocuments({ user: req.user._id, read: false }),
    ]);
    res.json({ notifications, unreadCount });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/notifications/read-all
export const markAllRead = async (req, res) => {
  try {
    await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
    res.json({ message: "All notifications marked as read" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/notifications/:id/read
export const markRead = async (req, res) => {
  try {
    // Filtering by user too means nobody can touch someone else's notification
    await Notification.updateOne({ _id: req.params.id, user: req.user._id }, { read: true });
    res.json({ message: "Marked as read" });
  } catch (error) {
    if (error.name === "CastError") return res.status(404).json({ message: "Not found" });
    res.status(500).json({ message: error.message });
  }
};