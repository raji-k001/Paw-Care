import express from "express";
import {
  createReport, getReports, getMyReports, getReport, getMatches, contactOwner, updateStatus,
} from "../controllers/lostFoundController.js";
import { protect } from "../middleware/authMiddleware.js";
import upload from "../middleware/upload.js";

const router = express.Router();

router.get("/", getReports); // public
router.post("/", protect, upload.array("images", 5), createReport);
router.get("/mine", protect, getMyReports); // before "/:id"
router.get("/:id", getReport); // public
router.get("/:id/matches", protect, getMatches);
router.post("/:id/contact", protect, contactOwner);
router.put("/:id/status", protect, updateStatus);

export default router;