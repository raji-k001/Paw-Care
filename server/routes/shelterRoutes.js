import express from "express";
import {
  registerShelter, getApprovedShelters, getMyShelter, listAllShelters,
  reviewShelter, assignStaff, updateShelter,
} from "../controllers/shelterController.js";
import {
  getAnimals, transferPet, dischargePet, getMovements,
  getSupplies, addSupply, adjustSupply, deleteSupply,
  getExpenses, addExpense, getReport,
} from "../controllers/shelterOpsController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";
import { uploadDocs } from "../middleware/upload.js";

const router = express.Router();
const staff = authorize("shelter_staff", "admin");
const admin = authorize("admin");

router.get("/", getApprovedShelters); // public
router.post("/", protect, registerShelter);
router.get("/mine", protect, getMyShelter); // fixed paths before "/:id"
router.get("/admin/all", protect, admin, listAllShelters);

router.put("/:id/review", protect, admin, reviewShelter);
router.put("/:id/staff", protect, admin, assignStaff);
router.put("/:id", protect, staff, updateShelter);

router.get("/:id/animals", protect, staff, getAnimals);
router.get("/:id/movements", protect, staff, getMovements);
router.post("/:id/transfer", protect, staff, transferPet);
router.post("/:id/discharge", protect, staff, dischargePet);

router.get("/:id/supplies", protect, staff, getSupplies);
router.post("/:id/supplies", protect, staff, addSupply);
router.put("/:id/supplies/:itemId/adjust", protect, staff, adjustSupply);
router.delete("/:id/supplies/:itemId", protect, staff, deleteSupply);

router.get("/:id/expenses", protect, staff, getExpenses);
router.post("/:id/expenses", protect, staff, uploadDocs.single("receipt"), addExpense);

router.get("/:id/report", protect, staff, getReport);

export default router;