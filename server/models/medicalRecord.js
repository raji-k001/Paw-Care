import mongoose from "mongoose";

const medicalSchema = new mongoose.Schema(
  {
    pet: { type: mongoose.Schema.Types.ObjectId, ref: "Pet", required: true },
    type: {
      type: String,
      enum: ["vaccination", "deworming", "checkup", "treatment", "surgery", "sterilization", "other"],
      required: true,
    },
    title: { type: String, required: true, trim: true }, // e.g. "Rabies vaccine"
    date: { type: Date, required: true, default: Date.now },
    diagnosis: { type: String, maxlength: 1000 },
    treatment: { type: String, maxlength: 1000 },
    medication: { type: String, maxlength: 500 },
    vetName: { type: String, trim: true },
    notes: { type: String, maxlength: 1000 },
    documents: [{ url: String, public_id: String }], // reports and prescriptions

    // Follow-up and reminders
    nextDueDate: Date,
    followUpDone: { type: Boolean, default: false },
    reminderSent: { type: Boolean, default: false },

    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

// If the due date changes, the reminder should be sent again
medicalSchema.pre("save", async function () {
  if (this.isModified("nextDueDate")) this.reminderSent = false;
});

medicalSchema.index({ pet: 1, date: -1 });
medicalSchema.index({ followUpDone: 1, nextDueDate: 1 });

export default mongoose.models.MedicalRecord || mongoose.model("MedicalRecord", medicalSchema);