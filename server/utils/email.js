import nodemailer from "nodemailer";

let transporter;

// Created on first use, so it runs after dotenv has loaded .env
const getTransporter = () => {
  if (transporter) return transporter;
  if (!process.env.SMTP_HOST) return null;

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_PORT === "465",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return transporter;
};

// Brevo's HTTP API works on hosts that block SMTP ports, such as Render's free plan
const sendWithBrevo = async ({ to, subject, text }) => {
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": process.env.BREVO_API_KEY,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      sender: { name: process.env.MAIL_SENDER_NAME || "PawCare", email: process.env.MAIL_SENDER_EMAIL },
      to: [{ email: to }],
      subject,
      textContent: text,
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`Brevo responded ${res.status}: ${await res.text()}`);
};

export const sendEmail = async ({ to, subject, text }) => {
  try {
    if (process.env.BREVO_API_KEY && process.env.MAIL_SENDER_EMAIL) {
      return await sendWithBrevo({ to, subject, text });
    }
    const t = getTransporter();
    if (!t) return; // email not configured: skip silently
    await t.sendMail({ from: process.env.EMAIL_FROM || process.env.SMTP_USER, to, subject, text });
  } catch (error) {
    // A failed email must never break the request that triggered it
    console.error("Email failed:", error.message);
  }
};