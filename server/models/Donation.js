import mongoose from "mongoose";

const donationSchema = new mongoose.Schema(
  {
    campaign: { type: mongoose.Schema.Types.ObjectId, ref: "Campaign", required: true },
    donor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true, min: 10 }, // rupees
    anonymous: { type: Boolean, default: false },
    status: { type: String, enum: ["Created", "Paid"], default: "Created" },
    razorpayOrderId: String,
    razorpayPaymentId: String,
    receiptNumber: String,
    paidAt: Date,
  },
  { timestamps: true }
);

// Unique, but only for documents that have the field
donationSchema.index({ razorpayOrderId: 1 }, { unique: true, sparse: true });
donationSchema.index({ receiptNumber: 1 }, { unique: true, sparse: true });
donationSchema.index({ campaign: 1, status: 1, paidAt: -1 });

export default mongoose.models.Donation || mongoose.model("Donation", donationSchema);