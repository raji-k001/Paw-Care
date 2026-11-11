import express from "express";
import { createFlag, listFlags, reviewFlag } from "../controllers/flagController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", protect, createFlag);
router.get("/", protect, authorize("admin"), listFlags);
router.put("/:id/review", protect, authorize("admin"), reviewFlag);

export default router;