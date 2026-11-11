import mongoose from "mongoose";

const supplySchema = new mongoose.Schema(
  {
    shelter: { type: mongoose.Schema.Types.ObjectId, ref: "Shelter", required: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    category: { type: String, enum: ["food", "medicine", "supplies", "other"], default: "supplies" },
    quantity: { type: Number, default: 0, min: 0 },
    unit: { type: String, default: "units", trim: true, maxlength: 20 },
    lowStockThreshold: { type: Number, default: 5, min: 0 },
    expiryDate: Date,
    lowStockNotified: { type: Boolean, default: false }, // so staff are alerted once, not on every change
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

supplySchema.index({ shelter: 1, category: 1, name: 1 });

export default mongoose.models.SupplyItem || mongoose.model("SupplyItem", supplySchema);