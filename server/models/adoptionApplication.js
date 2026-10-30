import mongoose from "mongoose";

const applicationSchema = new mongoose.Schema(
  {
    pet: { type: mongoose.Schema.Types.ObjectId, ref: "Pet", required: true },
    applicant: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    // Housing and pet-care details
    housingType: { type: String, enum: ["house", "apartment", "other"], required: true },
    ownsHome: { type: Boolean, default: false }, // false = rented
    hasYard: { type: Boolean, default: false },
    householdSize: { type: Number, min: 1, required: true },
    otherPets: { type: Boolean, default: false },
    experience: { type: String, maxlength: 1000 },
    hoursAlonePerDay: { type: Number, min: 0, max: 24 },
    reason: { type: String, required: true, maxlength: 1000 },

    documents: [{ url: String, public_id: String }],

    // Workflow
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected", "Withdrawn"],
      default: "Pending",
    },
    rejectionReason: String,
    visitDate: Date,
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewedAt: Date,
  },
  { timestamps: true }
);

// A user can have only ONE pending application per pet (enforced by the database itself)
applicationSchema.index(
  { pet: 1, applicant: 1 },
  { unique: true, partialFilterExpression: { status: "Pending" } }
);

export default mongoose.models.AdoptionApplication || mongoose.model("AdoptionApplication", applicationSchema);