import mongoose from "mongoose";

const auditSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    // Name and role are copied in, so the log stays readable even if the account is deleted later
    actorName: String,
    actorRole: String,
    action: { type: String, required: true }, // e.g. "shelter.approved"
    targetType: { type: String, required: true },
    targetId: mongoose.Schema.Types.ObjectId,
    summary: { type: String, maxlength: 300 },
  },
  { timestamps: true }
);

auditSchema.index({ createdAt: -1 });
auditSchema.index({ targetType: 1, createdAt: -1 });

export default mongoose.models.AuditLog || mongoose.model("AuditLog", auditSchema);