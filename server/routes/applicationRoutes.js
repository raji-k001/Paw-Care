import express from "express";
import {
  createApplication, getMyApplications, getApplications,
  getApplicationById, reviewApplication, withdrawApplication,
} from "../controllers/applicationController.js";
import { protect, authorize } from "../middleware/authmiddleware.js";
import { uploadDocs } from "../middleware/upload.js";

const router = express.Router();
const staffOnly = authorize("shelter_staff", "admin");

router.post("/", protect, uploadDocs.array("documents", 3), createApplication);
router.get("/", protect, staffOnly, getApplications);
router.get("/my", protect, getMyApplications); // must come BEFORE "/:id"
router.get("/:id", protect, getApplicationById);
router.put("/:id/review", protect, staffOnly, reviewApplication);
router.put("/:id/withdraw", protect, withdrawApplication);

export default router;