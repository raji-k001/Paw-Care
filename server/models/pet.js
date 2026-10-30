import mongoose from "mongoose";

const petSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    species: {
      type: String,
      required: true,
      enum: ["dog", "cat", "bird", "rabbit", "other"],
    },
    breed: { type: String, trim: true },
    age: { type: Number, min: 0 }, // in years; 0.5 = 6 months
    gender: { type: String, enum: ["male", "female", "unknown"], default: "unknown" },
    size: { type: String, enum: ["small", "medium", "large"] },
    color: { type: String, trim: true },
    description: { type: String, maxlength: 1000 },
    location: { type: String, required: true, trim: true }, // city
    vaccinated: { type: Boolean, default: false },
    sterilized: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["Available", "Pending", "Adopted"],
      default: "Available",
    },
    images: [{ url: String, public_id: String }],
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

// Speeds up the filters we use most
petSchema.index({ species: 1, status: 1, location: 1 });

export default mongoose.models.Pet || mongoose.model("Pet", petSchema);