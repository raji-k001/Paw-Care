import express from "express";
import { getMyNotifications, markAllRead, markRead } from "../controllers/notificationController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", protect, getMyNotifications);
router.put("/read-all", protect, markAllRead); // before "/:id/read"
router.put("/:id/read", protect, markRead);

export default router;