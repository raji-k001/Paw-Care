import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import petRoutes from "./routes/petRoutes.js";
import applicationRoutes from "./routes/applicationRoutes.js";
import rescueRoutes from "./routes/rescueRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";


dotenv.config();
connectDB();

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL }));
app.use(express.json()); // lets us read JSON from req.body

app.get("/", (req, res) => res.send("PawCare API is running"));
app.use("/api/auth", authRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

app.use("/api/auth", authRoutes);
app.use("/api/pets", petRoutes);

// Catches upload errors (file too big, not an image) and returns JSON
app.use((err, req, res, next) => {
  res.status(400).json({ message: err.message });
});

app.use("/api/pets", petRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/rescues", rescueRoutes);
app.use("/api/users", userRoutes);

app.use("/api/users", userRoutes);
app.use("/api/notifications", notificationRoutes);