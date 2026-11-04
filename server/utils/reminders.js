import cron from "node-cron";
import MedicalRecord from "../models/medicalRecord.js";
import { notify } from "./notify.js";

const DAY = 24 * 60 * 60 * 1000;

// Finds follow-ups due within 7 days (or already overdue) that nobody has been told about yet
export const sendDueReminders = async () => {
  const soon = new Date(Date.now() + 7 * DAY);

  const records = await MedicalRecord.find({
    followUpDone: false,
    reminderSent: false,
    nextDueDate: { $lte: soon },
  }).populate("pet", "name addedBy");

  let count = 0;
  for (const record of records) {
    if (!record.pet) continue; // the pet was deleted

    // A Set removes duplicates when the same person recorded it and listed the pet
    const recipients = new Set([record.recordedBy.toString(), record.pet.addedBy.toString()]);
    const overdue = record.nextDueDate < new Date();
    const dateText = record.nextDueDate.toLocaleDateString("en-IN");

    recipients.forEach((userId) =>
      notify(userId, {
        type: "system",
        message: `${record.pet.name}: "${record.title}" is ${overdue ? "overdue since" : "due on"} ${dateText}`,
        link: `/medical/${record.pet._id}`,
        email: "Pet medical reminder",
      })
    );

    // updateOne skips the pre-save hook, so reminderSent stays true
    await MedicalRecord.updateOne({ _id: record._id }, { reminderSent: true });
    count++;
  }
  return count;
};

// Runs every day at 8:00 AM India time
export const startReminderJob = () => {
  cron.schedule(
    "0 8 * * *",
    () => sendDueReminders().catch((err) => console.error("Reminder job failed:", err.message)),
    { timezone: "Asia/Kolkata" }
  );
  console.log("Medical reminder job scheduled (daily 8:00 AM IST)");
};