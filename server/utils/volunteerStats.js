import VolunteerTask from "../models/volunteerTask.js";

const round = (n) => Math.round(n * 100) / 100;

// Minimum hours before a volunteer can ask for a certificate (set CERT_MIN_HOURS in .env)
export const certMinHours = () => Number(process.env.CERT_MIN_HOURS) || 10;

// Hours and completed-task count for one volunteer, or for all volunteers when no id is given
export const getHoursByVolunteer = async (userId) => {
  const match = { status: "Completed" };
  if (userId) match.assignedTo = userId;

  const rows = await VolunteerTask.aggregate([
    { $match: match },
    { $group: { _id: "$assignedTo", hours: { $sum: "$hoursLogged" }, tasks: { $sum: 1 } } },
  ]);
  return rows.map((r) => ({ userId: r._id, hours: round(r.hours), tasks: r.tasks }));
};

export const getStats = async (userId) => {
  const [row] = await getHoursByVolunteer(userId);
  return { hours: row?.hours || 0, tasks: row?.tasks || 0 };
};