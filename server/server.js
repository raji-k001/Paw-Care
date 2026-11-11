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
import volunteerRoutes from "./routes/volunteerRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";
import certificateRoutes from "./routes/certificateRoutes.js";
import medicalRoutes from "./routes/medicalRoutes.js";
import { startReminderJob } from "./utils/reminders.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import campaignRoutes from "./routes/campaignRoutes.js";
import donationRoutes from "./routes/donationRoutes.js";
import shelterRoutes from "./routes/shelterRoutes.js";
import favoriteRoutes from "./routes/favoriteRoutes.js";
import lostFoundRoutes from "./routes/lostFoundRoutes.js";
import flagRoutes from "./routes/flagRoutes.js";

dotenv.config();
connectDB();

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL }));
app.use(express.json()); // lets us read JSON from req.body

app.get("/", (req, res) => res.send("PawCare API is running"));
app.use("/api/auth", authRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
startReminderJob();

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

app.use("/api/notifications", notificationRoutes);
app.use("/api/volunteers", volunteerRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/certificates", certificateRoutes);

app.use("/api/certificates", certificateRoutes);
app.use("/api/medical", medicalRoutes);

app.use("/api/medical", medicalRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.use("/api/dashboard", dashboardRoutes);
app.use("/api/campaigns", campaignRoutes);
app.use("/api/donations", donationRoutes);

app.use("/api/donations", donationRoutes);
app.use("/api/shelters", shelterRoutes);

app.use("/api/shelters", shelterRoutes);
app.use("/api/favorites", favoriteRoutes);

app.use("/api/favorites", favoriteRoutes);
app.use("/api/lostfound", lostFoundRoutes);
app.use("/api/flags", flagRoutes);