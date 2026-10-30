import express from "express";
import { getMyProfile, saveMyProfile, listVolunteers, verifyVolunteer } from "../controllers/volunteerController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();
const staffOnly = authorize("shelter_staff", "admin");

router.get("/me", protect, authorize("volunteer"), getMyProfile); // "/me" before "/:id"
router.put("/me", protect, authorize("volunteer"), saveMyProfile);
router.get("/", protect, staffOnly, listVolunteers);
router.put("/:id/verify", protect, staffOnly, verifyVolunteer);

export default router;