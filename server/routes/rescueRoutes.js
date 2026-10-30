import mongoose from "mongoose";

const URGENCY_RANK = { Low: 1, Medium: 2, High: 3, Critical: 4 };
const userRef = { type: mongoose.Schema.Types.ObjectId, ref: "User" };

const rescueSchema = new mongoose.Schema(
  {
    reportedBy: { ...userRef, required: true },
    category: { type: String, enum: ["injured", "abandoned", "other"], required: true },
    species: { type: String, required: true, trim: true },
    description: { type: String, required: true, maxlength: 1000 },
    urgency: { type: String, enum: ["Low", "Medium", "High", "Critical"], default: "Medium" },
    urgencyRank: { type: Number, default: 2 }, // lets MongoDB sort Critical first
    address: { type: String, trim: true },
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], required: true }, // [longitude, latitude]
    },
    images: [{ url: String, public_id: String }],
    status: {
      type: String,
      enum: ["Reported", "Assigned", "In Progress", "Resolved"],
      default: "Reported",
    },
    assignedTo: userRef,
    assignedBy: userRef,
    resolutionNote: String,
    history: [
      {
        status: String,
        by: userRef,
        note: String,
        at: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

// Keep urgencyRank in sync with urgency automatically
rescueSchema.pre("validate", function () {
  this.urgencyRank = URGENCY_RANK[this.urgency];
});

rescueSchema.index({ location: "2dsphere" }); // enables "find cases or shelters near me" queries later
rescueSchema.index({ status: 1, urgencyRank: -1, createdAt: -1 });

export default mongoose.model("rescueRequest", rescueSchema);