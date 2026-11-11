import mongoose from "mongoose";

const ref = (name) => ({ type: mongoose.Schema.Types.ObjectId, ref: name });

const movementSchema = new mongoose.Schema(
  {
    shelter: { ...ref("Shelter"), required: true }, // the shelter this entry belongs to
    pet: { ...ref("Pet"), required: true },
    type: { type: String, enum: ["intake", "transfer_in", "transfer_out", "discharge"], required: true },
    reason: String, // new_listing, adopted, returned_to_owner, released, deceased, other
    fromShelter: ref("Shelter"),
    toShelter: ref("Shelter"),
    note: { type: String, maxlength: 500 },
    by: ref("User"),
    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

movementSchema.index({ shelter: 1, date: -1 });

export default mongoose.models.AnimalMovement || mongoose.model("AnimalMovement", movementSchema);