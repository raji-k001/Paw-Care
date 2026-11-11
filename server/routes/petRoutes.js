import express from "express";
import {
  createPet, getPets, getPetById, updatePet, deletePet,comparePets,
} from "../controllers/petController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";
import upload from "../middleware/upload.js";

const router = express.Router();
const staffOnly = [protect, authorize("shelter_staff", "admin")];

router
  .route("/")
  .get(getPets) // public
  .post(...staffOnly, upload.array("images", 5), createPet);

router
  .get("/compare", comparePets)
  .route("/:id")
  .get(getPetById) // public
  .put(...staffOnly, upload.array("images", 5), updatePet)
  .delete(...staffOnly, deletePet);

export default router;