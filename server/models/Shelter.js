import mongoose from "mongoose";

const shelterSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, maxlength: 1000 },
    address: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    capacity: {
      type: Number,
      required: true,
      min: 1,
      validate: { validator: Number.isInteger, message: "Capacity must be a whole number" },
    },
    status: { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Pending" },
    rejectionReason: String,
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewedAt: Date,
  },
  { timestamps: true }
);

shelterSchema.index({ status: 1, city: 1 });

export default mongoose.models.Shelter || mongoose.model("Shelter", shelterSchema);