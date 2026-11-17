
import User from "../models/User.js";
import Pet from "../models/Pet.js";
import Application from "../models/adoptionApplication.js";
import RescueRequest from "../models/rescueRequest.js";
import VolunteerProfile from "../models/volunteerProfile.js";
import VolunteerTask from "../models/volunteerTask.js";
import MedicalRecord from "../models/medicalRecord.js";
import Certificate from "../models/certificate.js";
import Donation from "../models/Donation.js";
import Shelter from "../models/Shelter.js";
import Campaign from "../models/Campaign.js";
import ContentFlag from "../models/ContentFlag.js";

const IST_MS = 5.5 * 60 * 60 * 1000;

const sum = (obj) =>
  Object.values(obj).reduce((a, b) => a + b, 0);

// Last 6 months (oldest first)
const lastMonths = (count = 6) => {
  const shifted = new Date(Date.now() + IST_MS);
  const year = shifted.getUTCFullYear();
  const month = shifted.getUTCMonth();

  return Array.from({ length: count }, (_, i) => {
    const d = new Date(
      Date.UTC(year, month - (count - 1 - i), 1)
    );

    return {
      key: `${d.getUTCFullYear()}-${String(
        d.getUTCMonth() + 1
      ).padStart(2, "0")}`,

      label: d.toLocaleString("en-US", {
        month: "short",
        year: "2-digit",
        timeZone: "UTC",
      }),

      start: new Date(d.getTime() - IST_MS),
    };
  });
};

// Count documents by field value
const countMap = async (Model, field, match = {}) => {
  const rows = await Model.aggregate([
    { $match: match },
    {
      $group: {
        _id: `$${field}`,
        count: { $sum: 1 },
      },
    },
  ]);

  return Object.fromEntries(
    rows.map((r) => [r._id, r.count])
  );
};

// Count documents grouped by month
const monthlyMap = async (Model, dateField, match, since) => {
  const rows = await Model.aggregate([
    {
      $match: {
        ...match,
        [dateField]: { $gte: since },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: {
            format: "%Y-%m",
            date: `$${dateField}`,
            timezone: "Asia/Kolkata",
          },
        },
        count: { $sum: 1 },
      },
    },
  ]);

  return Object.fromEntries(
    rows.map((r) => [r._id, r.count])
  );
};

// Sum amounts grouped by month
const monthlySum = async (
  Model,
  dateField,
  sumField,
  match,
  since
) => {
  const rows = await Model.aggregate([
    {
      $match: {
        ...match,
        [dateField]: { $gte: since },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: {
            format: "%Y-%m",
            date: `$${dateField}`,
            timezone: "Asia/Kolkata",
          },
        },
        total: { $sum: `$${sumField}` },
      },
    },
  ]);

  return Object.fromEntries(
    rows.map((r) => [r._id, r.total])
  );
};

// GET /api/dashboard (admin)
export const getDashboard = async (req, res) => {
  try {
    const months = lastMonths(6);
    const since = months[0].start;

    const [
      usersByRole,
      petsByStatus,
      appsByStatus,
      rescuesByStatus,
      openRescuesByUrgency,
      adoptionsByMonth,
      rescuesByMonth,
      volunteersByVerified,
      taskTotals,
      treatmentPetIds,
      pendingCertificates,
      overdueFollowUps,
      donationTotals,
      activeCampaigns,
      donationsByMonth,
    ] = await Promise.all([
      countMap(User, "role"),

      countMap(Pet, "status"),

      countMap(Application, "status"),

      countMap(RescueRequest, "status"),

      countMap(
        RescueRequest,
        "urgency",
        { status: { $ne: "Resolved" } }
      ),

      monthlyMap(
        Application,
        "reviewedAt",
        { status: "Approved" },
        since
      ),

      monthlyMap(
        RescueRequest,
        "createdAt",
        {},
        since
      ),

      countMap(VolunteerProfile, "verified"),

      VolunteerTask.aggregate([
        { $match: { status: "Completed" } },
        {
          $group: {
            _id: null,
            hours: { $sum: "$hoursLogged" },
            tasks: { $sum: 1 },
          },
        },
      ]),

      // Pets currently under treatment
      MedicalRecord.distinct("pet", {
        type: { $in: ["treatment", "surgery"] },
        followUpDone: false,
        nextDueDate: { $ne: null },
      }),

      Certificate.countDocuments({
        status: "Pending",
      }),

      MedicalRecord.countDocuments({
        followUpDone: false,
        nextDueDate: { $lt: new Date() },
      }),

      Donation.aggregate([
        { $match: { status: "Paid" } },
        {
          $group: {
            _id: null,
            total: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
      ]),

      Campaign.countDocuments({
        status: "Active",
      }),

      monthlySum(
        Donation,
        "paidAt",
        "amount",
        { status: "Paid" },
        since
      ),
    ]);

    const underTreatment = await Pet.countDocuments({
      _id: { $in: treatmentPetIds },
    });

    const [approvedShelters, pendingShelters] =
      await Promise.all([
        Shelter.countDocuments({
          status: "Approved",
        }),

        Shelter.countDocuments({
          status: "Pending",
        }),
      ]);

    const openFlags = await ContentFlag.countDocuments({
      status: "Open",
    });

    // Dashboard response
    res.json({
      users: {
        total: sum(usersByRole),
        byRole: usersByRole,
      },

      pets: {
        total: sum(petsByStatus),
        byStatus: petsByStatus,
        underTreatment,
      },

      applications: {
        total: sum(appsByStatus),
        byStatus: appsByStatus,
      },

      rescues: {
        total: sum(rescuesByStatus),
        open:
          sum(rescuesByStatus) -
          (rescuesByStatus.Resolved || 0),
        resolved: rescuesByStatus.Resolved || 0,
        openByUrgency: openRescuesByUrgency,
      },

      volunteers: {
        verified: volunteersByVerified.true || 0,
        unverified: volunteersByVerified.false || 0,
        completedTasks: taskTotals[0]?.tasks || 0,
        hours:
          Math.round(
            (taskTotals[0]?.hours || 0) * 100
          ) / 100,
      },

      attention: {
        pendingApplications: appsByStatus.Pending || 0,
        unassignedRescues: rescuesByStatus.Reported || 0,
        unverifiedVolunteers:
          volunteersByVerified.false || 0,
        pendingCertificates,
        overdueFollowUps,
        pendingShelters,
        openFlags,
      },

      shelters: {
        approved: approvedShelters,
      },

      // Donation summary (top level)
      donations: {
        total: donationTotals[0]?.total || 0,
        count: donationTotals[0]?.count || 0,
        activeCampaigns,
      },

      // Monthly statistics
      monthly: months.map((m) => ({
        month: m.label,
        adoptions: adoptionsByMonth[m.key] || 0,
        rescues: rescuesByMonth[m.key] || 0,
        donations: donationsByMonth[m.key] || 0,
      })),

      generatedAt: new Date(),
    });
  } catch (error) {
    console.error("Dashboard API Error:", error);

    res.status(500).json({
      message: error.message,
    });
  }
};
