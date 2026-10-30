import express from "express";
import {
  createTask, getTasks, getMyTasks, respondToTask, completeTask, cancelTask,
} from "../controllers/taskController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();
const staffOnly = authorize("shelter_staff", "admin");

router.post("/", protect, staffOnly, createTask);
router.get("/", protect, staffOnly, getTasks);
router.get("/mine", protect, authorize("volunteer"), getMyTasks);
router.put("/:id/respond", protect, authorize("volunteer"), respondToTask);
router.put("/:id/complete", protect, authorize("volunteer"), completeTask);
router.put("/:id/cancel", protect, staffOnly, cancelTask);

export default router;