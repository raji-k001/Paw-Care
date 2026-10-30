import mongoose from "mongoose";

const certificateSchema = new mongoose.Schema(
  {
    volunteer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    hoursAtRequest: { type: Number, required: true },
    status: { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Pending" },
    reviewNote: String,
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewedAt: Date,
    certificateNumber: String,
  },
  { timestamps: true }
);

// Unique, but only for certificates that have a number (approved ones)
certificateSchema.index({ certificateNumber: 1 }, { unique: true, sparse: true });

export default mongoose.models.Certificate || mongoose.model("Certificate", certificateSchema);