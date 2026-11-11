import AuditLog from "../models/AuditLog.js";

// GET /api/audit?targetType=shelter&page=1  (admin)
export const getAuditLogs = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = 25;
    const filter = {};
    if (req.query.targetType) filter.targetType = String(req.query.targetType);

    const [logs, total] = await Promise.all([
      AuditLog.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      AuditLog.countDocuments(filter),
    ]);
    res.json({ logs, page, pages: Math.max(1, Math.ceil(total / limit)), total });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};