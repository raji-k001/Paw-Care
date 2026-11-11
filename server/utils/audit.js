import AuditLog from "../models/AuditLog.js";

// Fire-and-forget: a failed log entry must never break the action that triggered it
export const audit = (req, action, { targetType, targetId, summary }) => {
  AuditLog.create({
    actor: req.user._id,
    actorName: req.user.name,
    actorRole: req.user.role,
    action,
    targetType,
    targetId,
    summary: String(summary || "").slice(0, 300),
  }).catch((err) => console.error("Audit log failed:", err.message));
};