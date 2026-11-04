import express from "express";
import {
  listPets, getPetMedical, addRecord, updateCare,
  completeFollowUp, deleteRecord, getDue, runRemindersNow,
} from "../controllers/medicalController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";
import { uploadDocs } from "../middleware/upload.js";

const router = express.Router();
const medical = authorize("shelter_staff", "veterinarian", "admin");

router.get("/due", protect, medical, getDue);
router.get("/pets", protect, medical, listPets);
router.post("/run-reminders", protect, authorize("admin"), runRemindersNow);

router.get("/pets/:petId", protect, medical, getPetMedical);
router.post("/pets/:petId", protect, medical, uploadDocs.array("documents", 3), addRecord);
router.put("/pets/:petId/care", protect, medical, updateCare);

router.put("/records/:id/followup-done", protect, medical, completeFollowUp);
router.delete("/records/:id", protect, authorize("admin"), deleteRecord);

export default router;