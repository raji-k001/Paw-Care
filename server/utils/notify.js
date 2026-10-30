import Notification from "../models/notification.js";
import User from "../models/User.js";
import { sendEmail } from "./email.js";

// notify(userId, { type, message, link, email: "Email subject (optional)" })
export const notify = async (userId, { type, message, link, email }) => {
  try {
    const notification = await Notification.create({ user: userId, type, message, link });

    if (email) {
      const user = await User.findById(userId).select("name email");
      if (user) {
        // Not awaited on purpose: the email sends in the background
        sendEmail({
          to: user.email,
          subject: `PawCare: ${email}`,
          text: `Hi ${user.name},\n\n${message}\n\n${process.env.CLIENT_URL}${link || ""}\n\n- PawCare`,
        });
      }
    }
    return notification;
  } catch (error) {
    console.error("Notification failed:", error.message);
  }
};

// Notify every admin and shelter staff member (except the person who did the action)
export const notifyStaff = async (payload, excludeId) => {
  try {
    const staff = await User.find({ role: { $in: ["admin", "shelter_staff"] } }).select("_id");
    await Promise.all(
      staff
        .filter((s) => !excludeId || s._id.toString() !== excludeId.toString())
        .map((s) => notify(s._id, payload))
    );
  } catch (error) {
    console.error("Staff notification failed:", error.message);
  }
};