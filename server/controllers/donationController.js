import User from "../models/User.js";
import crypto from "crypto";
import Razorpay from "razorpay";
import Campaign from "../models/Campaign.js";
import Donation from "../models/Donation.js";
import { notify } from "../utils/notify.js";

let razorpay;

// Created on first use, so it runs after dotenv has loaded .env
const getRazorpay = () => {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) return null;
  if (!razorpay) {
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return razorpay;
};

// POST /api/donations/order  body: { campaignId, amount, anonymous }
export const createOrder = async (req, res) => {
  let donation;
  try {
    const rupees = Number(req.body.amount);
    if (!Number.isInteger(rupees) || rupees < 10 || rupees > 100000) {
      return res.status(400).json({ message: "Enter a whole amount between ₹10 and ₹1,00,000" });
    }

    const campaign = await Campaign.findById(req.body.campaignId);
    if (!campaign) return res.status(404).json({ message: "Campaign not found" });
    if (campaign.status !== "Active" || (campaign.endDate && campaign.endDate < new Date())) {
      return res.status(400).json({ message: "This campaign is no longer accepting donations" });
    }

    const rz = getRazorpay();
    if (!rz) return res.status(503).json({ message: "Payments are not configured on the server yet" });

    donation = await Donation.create({
      campaign: campaign._id,
      donor: req.user._id,
      amount: rupees,
      anonymous: req.body.anonymous === true || req.body.anonymous === "true",
    });

    // The server decides the amount. The browser cannot change what is charged.
    const order = await rz.orders.create({
      amount: rupees * 100, // paise
      currency: "INR",
      receipt: donation._id.toString(),
    });

    donation.razorpayOrderId = order.id;
    await donation.save();

    res.json({
      donationId: donation._id,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      campaignTitle: campaign.title,
    });
  } catch (error) {
    if (donation && !donation.razorpayOrderId) await Donation.deleteOne({ _id: donation._id });
    if (error.name === "CastError") return res.status(404).json({ message: "Campaign not found" });
    // Razorpay errors carry their message in error.error.description
    const message = error.error?.description || error.message;
    res.status(error.statusCode || 500).json({ message });
  }
};

// Marks a donation as paid exactly once and adds it to the campaign total.
// Both the browser confirmation (/verify) and Razorpay's webhook use it.
const finalizeDonation = async (donationId, paymentId) => {
  const paid = await Donation.findOneAndUpdate(
    { _id: donationId, status: "Created" },
    {
      status: "Paid",
      razorpayPaymentId: paymentId,
      paidAt: new Date(),
      receiptNumber: `PCR-${new Date().getFullYear()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`,
    },
    { new: true }
  );
  if (!paid) return null; // already confirmed by the other path

  const [campaign, donor] = await Promise.all([
    Campaign.findByIdAndUpdate(paid.campaign, { $inc: { raisedAmount: paid.amount } }, { new: true }),
    User.findById(paid.donor).select("name"),
  ]);

  notify(paid.donor, {
    type: "system",
    message: `Thank you! Your donation of ₹${paid.amount} to "${campaign?.title}" was received.`,
    link: `/donations/${paid._id}/receipt`,
    email: "Thank you for your donation",
  });
  if (campaign) {
    notify(campaign.createdBy, {
      type: "system",
      message: `${paid.anonymous ? "Someone" : donor?.name || "A supporter"} donated ₹${paid.amount} to "${campaign.title}"`,
      link: `/campaigns/${campaign._id}`,
    });
  }
  return paid;
};

// POST /api/donations/verify  body: { razorpay_order_id, razorpay_payment_id, razorpay_signature }
export const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ message: "Missing payment details" });
    }

    const donation = await Donation.findOne({ razorpayOrderId: razorpay_order_id, donor: req.user._id });
    if (!donation) return res.status(404).json({ message: "Donation not found" });
    if (donation.status === "Paid") return res.json(donation);

    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");
    const given = String(razorpay_signature);
    const valid =
      expected.length === given.length &&
      crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(given));
    if (!valid) return res.status(400).json({ message: "Payment verification failed" });

    const paid = await finalizeDonation(donation._id, razorpay_payment_id);
    res.json(paid || (await Donation.findById(donation._id)));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/donations/mine
export const getMyDonations = async (req, res) => {
  try {
    const donations = await Donation.find({ donor: req.user._id })
      .sort({ createdAt: -1 })
      .populate("campaign", "title");
    res.json(donations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/donations/:id  - the receipt (donor or admin)
export const getReceipt = async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id)
      .populate("donor", "name email")
      .populate("campaign", "title");
    if (!donation) return res.status(404).json({ message: "Donation not found" });

    const isOwner = donation.donor._id.toString() === req.user._id.toString();
    if (!isOwner && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not allowed to view this receipt" });
    }
    if (donation.status !== "Paid") {
      return res.status(400).json({ message: "This donation was not completed" });
    }
    res.json(donation);
  } catch (error) {
    if (error.name === "CastError") return res.status(404).json({ message: "Donation not found" });
    res.status(500).json({ message: error.message });
  }
};

// POST /api/webhooks/razorpay  (called by Razorpay, not by the browser)
export const razorpayWebhook = async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) return res.status(503).send("Webhook not configured");
    if (!Buffer.isBuffer(req.body)) return res.status(400).send("Bad request");

    // The signature covers the exact raw bytes, so this route receives the body unparsed
    const signature = String(req.headers["x-razorpay-signature"] || "");
    const expected = crypto.createHmac("sha256", secret).update(req.body).digest("hex");
    const valid =
      expected.length === signature.length &&
      crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
    if (!valid) return res.status(400).send("Invalid signature");

    const event = JSON.parse(req.body.toString("utf8"));
    if (["payment.captured", "order.paid"].includes(event.event)) {
      const payment = event.payload?.payment?.entity;
      const orderId = payment?.order_id;
      if (orderId && payment?.id) {
        const donation = await Donation.findOne({ razorpayOrderId: orderId, status: "Created" });
        // Only accept it if the amount Razorpay received equals what we asked for
        if (donation && payment.currency === "INR" && payment.amount === donation.amount * 100) {
          await finalizeDonation(donation._id, payment.id);
        }
      }
    }
    res.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error.message);
    res.status(500).send("Error"); // Razorpay retries after an error
  }
};