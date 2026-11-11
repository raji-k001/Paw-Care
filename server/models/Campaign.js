import mongoose from "mongoose";

const wholeNumber = { validator: Number.isInteger, message: "Amount must be a whole number" };

const expenseSchema = new mongoose.Schema({
  description: { type: String, required: true, trim: true, maxlength: 200 },
  amount: { type: Number, required: true, min: 1, validate: wholeNumber },
  date: { type: Date, default: Date.now },
  receipt: { url: String, public_id: String },
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
});

const campaignSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, required: true, maxlength: 2000 },
    category: { type: String, enum: ["medical", "food", "shelter", "other"], required: true },
    goalAmount: { type: Number, required: true, min: 100, validate: wholeNumber },
    raisedAmount: { type: Number, default: 0, min: 0 }, // only ever changed by verified payments
    status: { type: String, enum: ["Active", "Completed", "Closed"], default: "Active" },
    endDate: Date,
    image: { url: String, public_id: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    expenses: [expenseSchema],
  },
  { timestamps: true }
);

campaignSchema.index({ status: 1, createdAt: -1 });

export default mongoose.models.Campaign || mongoose.model("Campaign", campaignSchema);