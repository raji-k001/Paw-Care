import VolunteerProfile from "../models/volunteerProfile.js";
import { getStats, getHoursByVolunteer, certMinHours } from "../utils/volunteerStats.js";
import { notify, notifyStaff } from "../utils/notify.js";

// GET /api/volunteers/me
export const getMyProfile = async (req, res) => {
  try {
    const [profile, stats] = await Promise.all([
      VolunteerProfile.findOne({ user: req.user._id }),
      getStats(req.user._id),
    ]);
    res.json({ profile, stats, minHours: certMinHours() });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/volunteers/me  - create or update my profile
export const saveMyProfile = async (req, res) => {
  try {
    const { skills, availableDays, preferredTime, city, bio } = req.body;

    let profile = await VolunteerProfile.findOne({ user: req.user._id });
    const isNew = !profile;
    if (!profile) profile = new VolunteerProfile({ user: req.user._id });

    // We pick the fields ourselves, so a volunteer can never set verified: true
    Object.assign(profile, { skills, availableDays, preferredTime, city, bio });
    await profile.save();

    if (isNew) {
      notifyStaff(
        {
          type: "system",
          message: `${req.user.name} registered as a volunteer and needs verification`,
          link: "/staff/volunteers",
        },
        req.user._id
      );
    }
    res.json(profile);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// GET /api/volunteers?verified=true  (staff, admin)
export const listVolunteers = async (req, res) => {
  try {
    const filter = {};
    if (req.query.verified) filter.verified = req.query.verified === "true";

    const [profiles, hours] = await Promise.all([
      VolunteerProfile.find(filter).populate("user", "name email phone").sort({ createdAt: -1 }),
      getHoursByVolunteer(),
    ]);

    const hoursById = new Map(hours.map((h) => [h.userId.toString(), h]));
    const result = profiles
      .filter((p) => p.user) // skip profiles whose user was deleted
      .map((p) => ({
        ...p.toObject(),
        hours: hoursById.get(p.user._id.toString())?.hours || 0,
        completedTasks: hoursById.get(p.user._id.toString())?.tasks || 0,
      }));
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/volunteers/:id/verify  (staff, admin)  body: { verified: true | false }
export const verifyVolunteer = async (req, res) => {
  try {
    const profile = await VolunteerProfile.findById(req.params.id);
    if (!profile) return res.status(404).json({ message: "Volunteer profile not found" });

    const verified = req.body.verified === true;
    profile.verified = verified;
    profile.verifiedBy = verified ? req.user._id : undefined;
    profile.verifiedAt = verified ? new Date() : undefined;
    await profile.save();

    notify(profile.user, {
      type: "system",
      message: verified
        ? "Your volunteer profile has been verified. You can now receive tasks."
        : "Your volunteer verification was removed. Please contact the shelter.",
      link: "/volunteer",
      email: verified ? "Your volunteer profile is verified" : undefined,
    });
    res.json(profile);
  } catch (error) {
    if (error.name === "CastError") return res.status(404).json({ message: "Volunteer profile not found" });
    res.status(500).json({ message: error.message });
  }
};