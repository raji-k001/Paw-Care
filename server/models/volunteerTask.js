import mongoose from "mongoose";

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["rescue", "feeding", "transportation", "shelter_duty", "other"],
      required: true,
    },
    description: { type: String, maxlength: 1000 },
    location: { type: String, trim: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: ["Assigned", "Accepted", "Declined", "Completed", "Cancelled"],
      default: "Assigned",
    },
    declineReason: String,
    hoursLogged: { type: Number, min: 0, max: 24 },
    completionNote: String,
    completedAt: Date,
  },
  { timestamps: true }
);

taskSchema.index({ assignedTo: 1, startTime: 1 });

export default mongoose.models.volunteerTask || mongoose.model("VolunteerTask", taskSchema);