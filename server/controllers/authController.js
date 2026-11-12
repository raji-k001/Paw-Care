import crypto from "crypto";
import { sendEmail } from "../utils/email.js";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });

// POST /api/auth/register
export const registerUser = async (req, res) => {
  try {
    const { name, email, password, phone, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: "Email already registered" });

    // Security: public signup can only choose adopter or volunteer.
    // Admin, staff and vet accounts are created by an admin later.
    const safeRole = ["adopter", "volunteer"].includes(role) ? role : "adopter";

    const user = await User.create({ name, email, password, phone, role: safeRole });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/auth/login
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
        if (typeof email !== "string" || typeof password !== "string") {
      return res.status(400).json({ message: "Enter your email and password" });
    }

    const user = await User.findOne({ email }).select("+password");
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/auth/me  (protected)
export const getMe = async (req, res) => {
  res.json(req.user);
};

const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

// POST /api/auth/forgot-password  body: { email }
export const forgotPassword = async (req, res) => {
  try {
    const email = String(req.body.email || "").toLowerCase().trim();
    if (!email) return res.status(400).json({ message: "Please enter your email" });

    const user = await User.findOne({ email });
    if (user) {
      const token = crypto.randomBytes(32).toString("hex");
      // Only a hash is stored, so a database leak can't be used to reset passwords
      await User.updateOne(
        { _id: user._id },
        { resetPasswordToken: hashToken(token), resetPasswordExpires: new Date(Date.now() + 30 * 60 * 1000) }
      );

      const link = `${process.env.CLIENT_URL}/reset-password/${token}`;
      sendEmail({
        to: user.email,
        subject: "PawCare: reset your password",
        text: `Hi ${user.name},\n\nUse this link to choose a new password. It works for 30 minutes:\n${link}\n\nIf you did not ask for this, you can ignore this email.\n\n- PawCare`,
      });

      // Local testing only: show the link in the server terminal when email isn't set up
      if (!process.env.SMTP_HOST && process.env.NODE_ENV !== "production") {
        console.log("Password reset link (development only):", link);
      }
    }

    // The same answer whether or not the email exists, so nobody can find out who has an account
    res.json({ message: "If an account exists for that email, a reset link has been sent." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/auth/reset-password  body: { token, password }
export const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password || password.length < 6) {
      return res.status(400).json({ message: "Enter a new password of at least 6 characters" });
    }

    const user = await User.findOne({
      resetPasswordToken: hashToken(String(token)),
      resetPasswordExpires: { $gt: new Date() },
    }).select("+password");
    if (!user) return res.status(400).json({ message: "This reset link is invalid or has expired" });

    user.password = password; // the pre-save hook hashes it
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined; // single use
    user.passwordChangedAt = new Date();
    await user.save();

    sendEmail({
      to: user.email,
      subject: "PawCare: your password was changed",
      text: `Hi ${user.name},\n\nYour password was just changed. If this was not you, please contact the shelter right away.\n\n- PawCare`,
    });
    res.json({ message: "Password updated. You can log in now." });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};