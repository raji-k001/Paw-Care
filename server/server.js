import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import connectDB from "./config/db.js";
import sanitizeInput from "./middleware/sanitize.js";
import { startReminderJob, sendDueRemainders} from "./utils/reminders.js";
import { razorpayWebhook } from "./controllers/donationController.js";
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
import dashboardRoutes from "./routes/dashboardRoutes.js";
import campaignRoutes from "./routes/campaignRoutes.js";
import donationRoutes from "./routes/donationRoutes.js";
import shelterRoutes from "./routes/shelterRoutes.js";
import favoriteRoutes from "./routes/favoriteRoutes.js";
import lostFoundRoutes from "./routes/lostFoundRoutes.js";
import flagRoutes from "./routes/flagRoutes.js";
import auditRoutes from "./routes/auditRoutes.js";

dotenv.config();

// Refuse to start with a missing or weak signing secret
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) {
  console.error("JWT_SECRET is missing or too short. Use at least 16 random characters in .env");
  process.exit(1);
}

connectDB();

const app = express();
if (process.env.NODE_ENV === "production") app.set("trust proxy", 1); // behind Render's proxy

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({ origin: process.env.CLIENT_URL }));

app.use(cors({ origin: process.env.CLIENT_URL }));
app.post("/api/webhooks/razorpay", express.raw({ type: "application/json", limit: "100kb" }), razorpayWebhook);
app.use(express.json({ limit: "100kb" }));

app.use(express.json({ limit: "100kb" }));
app.use(sanitizeInput);

// ---- Rate limits (counters live in memory and reset when the server restarts) ----
const limiter = (minutes, limit, message, extra = {}) =>
  rateLimit({
    windowMs: minutes * 60 * 1000,
    limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { message },
    ...extra,
  });

app.use("/api", limiter(15, 1000, "Too many requests. Please slow down and try again later."));
app.use(
  "/api/auth/login",
  limiter(15, 10, "Too many failed login attempts. Try again in 15 minutes.", { skipSuccessfulRequests: true })
);
app.use("/api/auth/register", limiter(60, 20, "Too many sign-ups from this network. Try again later."));
app.use("/api/auth/forgot-password", limiter(60, 5, "Too many reset requests. Try again in an hour."));
app.use("/api/auth/reset-password", limiter(60, 10, "Too many attempts. Try again in an hour."));
app.use("/api/donations", limiter(15, 60, "Too many payment requests. Please wait a few minutes."));

// ---- Routes ----
app.get("/", (req, res) => res.send("PawCare API is running"));
app.use("/api/auth", authRoutes);
app.use("/api/pets", petRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/rescues", rescueRoutes);
app.use("/api/users", userRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/volunteers", volunteerRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/certificates", certificateRoutes);
app.use("/api/medical", medicalRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/campaigns", campaignRoutes);
app.use("/api/donations", donationRoutes);
app.use("/api/shelters", shelterRoutes);
app.use("/api/favorites", favoriteRoutes);
app.use("/api/lostfound", lostFoundRoutes);
app.use("/api/flags", flagRoutes);
app.use("/api/audit", auditRoutes);

app.get("/health", (req, res) => res.json({ ok: true }));

// Called once a day by an outside timer (a sleeping free server cannot run node-cron)
app.post("/api/cron/reminders", async (req, res) => {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers["x-cron-secret"] !== secret) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  try {
    const count = await sendDueReminders();
    res.json({ message: `${count} reminder(s) sent` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
// Unknown API address
app.use("/api", (req, res) => res.status(404).json({ message: "Route not found" }));

// Catches upload errors, oversized bodies and bad JSON, and always answers in JSON
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  res.status(err.status || err.statusCode || 400).json({ message: err.message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
startReminderJob();