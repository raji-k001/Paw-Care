import nodemailer from "nodemailer";

let transporter;

// Created on first use, so it runs after dotenv has loaded .env
const getTransporter = () => {
  if (transporter) return transporter;
  if (!process.env.SMTP_HOST) return null; // email not configured: skip silently

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_PORT === "465",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return transporter;
};

export const sendEmail = async ({ to, subject, text }) => {
  const t = getTransporter();
  if (!t) return;
  try {
    await t.sendMail({ from: process.env.EMAIL_FROM || process.env.SMTP_USER, to, subject, text });
  } catch (error) {
    // A failed email must never break the request that triggered it
    console.error("Email failed:", error.message);
  }
};