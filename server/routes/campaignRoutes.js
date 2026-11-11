import express from "express";
import {
  createCampaign, getCampaigns, getCampaign, updateCampaign, addExpense,
} from "../controllers/campaignController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";
import upload, { uploadDocs } from "../middleware/upload.js";

const router = express.Router();
const staffOnly = authorize("shelter_staff", "admin");

router.get("/", getCampaigns); // public
router.post("/", protect, staffOnly, upload.single("image"), createCampaign);
router.get("/:id", getCampaign); // public
router.put("/:id", protect, staffOnly, updateCampaign);
router.post("/:id/expenses", protect, staffOnly, uploadDocs.single("receipt"), addExpense);

export default router;