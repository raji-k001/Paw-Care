import express from "express";
import { createOrder, verifyPayment, getMyDonations, getReceipt } from "../controllers/donationController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/order", protect, createOrder);
router.post("/verify", protect, verifyPayment);
router.get("/mine", protect, getMyDonations); // before "/:id"
router.get("/:id", protect, getReceipt);

export default router;