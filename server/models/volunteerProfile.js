import mongoose from "mongoose";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const profileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    skills: [{ type: String, trim: true }],
    availableDays: [{ type: String, enum: DAYS }],
    preferredTime: {
      type: String,
      enum: ["morning", "afternoon", "evening", "flexible"],
      default: "flexible",
    },
    city: { type: String, trim: true },
    bio: { type: String, maxlength: 500 },
    verified: { type: Boolean, default: false },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    verifiedAt: Date,
  },
  { timestamps: true }
);

export default mongoose.models.volunteerProfile || mongoose.model("volunteerProfile", profileSchema);