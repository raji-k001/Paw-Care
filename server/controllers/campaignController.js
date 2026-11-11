import Campaign from "../models/Campaign.js";
import Donation from "../models/Donation.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";

const canManage = (campaign, user) =>
  user.role === "admin" || campaign.createdBy.toString() === user._id.toString();

const spentOf = (campaign) => campaign.expenses.reduce((sum, e) => sum + e.amount, 0);

// POST /api/campaigns  (staff, admin)
export const createCampaign = async (req, res) => {
  try {
    const { title, description, category, goalAmount, endDate } = req.body;

    if (endDate && new Date(endDate) <= new Date()) {
      return res.status(400).json({ message: "The end date must be in the future" });
    }
    const image = req.file ? await uploadToCloudinary(req.file.buffer, "pawcare/campaigns") : undefined;

    const campaign = await Campaign.create({
      title, description, category, image,
      goalAmount: Number(goalAmount),
      endDate: endDate || undefined,
      createdBy: req.user._id,
    });
    res.status(201).json(campaign);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// GET /api/campaigns?status=Active  (public)
export const getCampaigns = async (req, res) => {
  try {
    const status = req.query.status || "Active";
    const campaigns = await Campaign.find({ status }).select("-expenses").sort({ createdAt: -1 });
    res.json(campaigns);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/campaigns/:id  (public)
export const getCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id).populate("createdBy", "name");
    if (!campaign) return res.status(404).json({ message: "Campaign not found" });

    const [donations, donorCount] = await Promise.all([
      Donation.find({ campaign: campaign._id, status: "Paid" })
        .sort({ paidAt: -1 })
        .limit(10)
        .populate("donor", "name"),
      Donation.countDocuments({ campaign: campaign._id, status: "Paid" }),
    ]);

    // Anonymous donors are never revealed here, and emails are never sent
    const recentDonors = donations.map((d) => ({
      name: d.anonymous ? "Anonymous" : d.donor?.name || "A supporter",
      amount: d.amount,
      paidAt: d.paidAt,
    }));

    const spent = spentOf(campaign);
    const data = campaign.toObject();
    data.expenses.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({
      campaign: data,
      summary: { income: campaign.raisedAmount, expenses: spent, balance: campaign.raisedAmount - spent },
      recentDonors,
      donorCount,
    });
  } catch (error) {
    if (error.name === "CastError") return res.status(404).json({ message: "Campaign not found" });
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/campaigns/:id  (creator or admin)

export const updateCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ message: "Campaign not found" });
    if (!canManage(campaign, req.user)) {
      return res.status(403).json({ message: "You can only change campaigns you created" });
    }

    const { title, description, category, goalAmount, endDate, status } = req.body;

    if (goalAmount !== undefined) {
      const goal = Number(goalAmount);
      if (!Number.isInteger(goal) || goal < 100) {
        return res.status(400).json({ message: "The goal must be a whole number of at least ₹100" });
      }
      if (goal < campaign.raisedAmount) {
        return res.status(400).json({ message: `The goal cannot be lower than the ₹${campaign.raisedAmount} already raised` });
      }
      campaign.goalAmount = goal;
    }

    if (endDate !== undefined) {
      if (endDate === "" || endDate === null) {
        campaign.endDate = undefined; // no end date
      } else if (new Date(endDate) <= new Date()) {
        return res.status(400).json({ message: "The end date must be in the future" });
      } else {
        campaign.endDate = endDate;
      }
    }

    // raisedAmount and expenses are never changed here
    if (title !== undefined) campaign.title = title;
    if (description !== undefined) campaign.description = description;
    if (category !== undefined) campaign.category = category;
    if (status !== undefined) campaign.status = status;

    await campaign.save();
    res.json(campaign);
  } catch (error) {
    if (error.name === "CastError") return res.status(404).json({ message: "Campaign not found" });
    res.status(400).json({ message: error.message });
  }
};

// POST /api/campaigns/:id/expenses  (creator or admin)
export const addExpense = async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ message: "Campaign not found" });
    if (!canManage(campaign, req.user)) {
      return res.status(403).json({ message: "You can only add expenses to campaigns you created" });
    }

    const { description, date } = req.body;
    const amount = Number(req.body.amount);
    if (!description?.trim()) return res.status(400).json({ message: "Please describe the expense" });
    if (!Number.isInteger(amount) || amount < 1) {
      return res.status(400).json({ message: "Enter the expense as a whole number of rupees" });
    }

    // You cannot spend more than the campaign has received
    const balance = campaign.raisedAmount - spentOf(campaign);
    if (amount > balance) {
      return res.status(400).json({ message: `Expenses cannot exceed the funds received (balance: ₹${balance})` });
    }

    const receipt = req.file ? await uploadToCloudinary(req.file.buffer, "pawcare/expenses") : undefined;
    campaign.expenses.push({ description, amount, date: date || undefined, receipt, addedBy: req.user._id });
    await campaign.save();

    res.status(201).json(campaign.expenses[campaign.expenses.length - 1]);
  } catch (error) {
    if (error.name === "CastError") return res.status(404).json({ message: "Campaign not found" });
    res.status(400).json({ message: error.message });
  }
};