import mongoose from "mongoose";

const flagSchema = new mongoose.Schema(
  {
    targetType: { type: String, enum: ["pet", "campaign", "lostfound"], required: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    reason: {
      type: String,
      enum: ["fake_listing", "scam", "inappropriate", "spam", "animal_abuse", "other"],
      required: true,
    },
    details: { type: String, maxlength: 500 },
    status: { type: String, enum: ["Open", "Resolved", "Dismissed"], default: "Open" },
    reviewNote: String,
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewedAt: Date,
  },
  { timestamps: true }
);

// A person can have only one OPEN report on the same listing
flagSchema.index(
  { targetType: 1, targetId: 1, reportedBy: 1 },
  { unique: true, partialFilterExpression: { status: "Open" } }
);
flagSchema.index({ status: 1, createdAt: -1 });

export default mongoose.models.ContentFlag || mongoose.model("ContentFlag", flagSchema);