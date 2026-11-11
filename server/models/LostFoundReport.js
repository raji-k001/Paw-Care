import mongoose from "mongoose";

const reportSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["lost", "found"], required: true },
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    species: { type: String, enum: ["dog", "cat", "bird", "rabbit", "other"], required: true },
    name: { type: String, trim: true, maxlength: 60 }, // the pet's name (lost reports)
    breed: { type: String, trim: true, maxlength: 60 },
    color: { type: String, required: true, trim: true, maxlength: 60 },
    gender: { type: String, enum: ["male", "female", "unknown"], default: "unknown" },
    size: { type: String, enum: ["small", "medium", "large"] },
    markings: { type: String, maxlength: 300 }, // collar, scar, microchip...
    description: { type: String, required: true, maxlength: 1000 },
    date: { type: Date, required: true }, // when it was lost or found
    address: { type: String, trim: true, maxlength: 200 },
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], required: true }, // [longitude, latitude]
    },
    images: [{ url: String, public_id: String }],
    status: { type: String, enum: ["Open", "Reunited", "Closed"], default: "Open" },
    hidden: { type: Boolean, default: false }, // set by an admin when a report is removed
    contactedBy: { type: [mongoose.Schema.Types.ObjectId], select: false }, // one message per person
  },
  { timestamps: true }
);

reportSchema.index({ location: "2dsphere" });
reportSchema.index({ type: 1, status: 1, species: 1, createdAt: -1 });

export default mongoose.models.LostFoundReport || mongoose.model("LostFoundReport", reportSchema);