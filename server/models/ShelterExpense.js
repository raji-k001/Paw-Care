import mongoose from "mongoose";

const expenseSchema = new mongoose.Schema(
  {
    shelter: { type: mongoose.Schema.Types.ObjectId, ref: "Shelter", required: true },
    category: {
      type: String,
      enum: ["food", "medicine", "veterinary", "utilities", "transport", "other"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
      validate: { validator: Number.isInteger, message: "Amount must be a whole number of rupees" },
    },
    description: { type: String, required: true, trim: true, maxlength: 200 },
    date: { type: Date, default: Date.now },
    receipt: { url: String, public_id: String },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

expenseSchema.index({ shelter: 1, date: -1 });

export default mongoose.models.ShelterExpense || mongoose.model("ShelterExpense", expenseSchema);