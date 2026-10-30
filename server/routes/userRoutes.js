import express from "express";
import User from "../models/User.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

// GET /api/users/responders
router.get("/responders", protect, authorize("shelter_staff", "admin"), async (req, res) => {
  try {
    const users = await User.find({ role: { $in: ["volunteer", "shelter_staff"] } })
      .select("name role phone")
      .sort("name");
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;