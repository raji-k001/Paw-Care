import express from "express";
import {
  requestCertificate, getMyCertificates, getCertificates, reviewCertificate, getCertificate,
} from "../controllers/certificateController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", protect, authorize("volunteer"), requestCertificate);
router.get("/mine", protect, authorize("volunteer"), getMyCertificates);
router.get("/", protect, authorize("admin"), getCertificates);
router.put("/:id/review", protect, authorize("admin"), reviewCertificate);
router.get("/:id", protect, getCertificate);

export default router;