import express from "express";
import { getFavoriteIds, getFavorites, addFavorite, removeFavorite } from "../controllers/favoriteController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", protect, getFavorites);
router.get("/ids", protect, getFavoriteIds); // before "/:petId"
router.post("/:petId", protect, addFavorite);
router.delete("/:petId", protect, removeFavorite);

export default router;