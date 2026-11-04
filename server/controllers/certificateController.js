import crypto from "crypto";
import Certificate from "../models/certificate.js";
import VolunteerProfile from "../models/volunteerProfile.js";
import { getStats, certMinHours } from "../utils/volunteerStats.js";
import { notify, notifyStaff } from "../utils/notify.js";

const sameId = (a, b) => a && b && a.toString() === b.toString();

// POST /api/certificates  - volunteer asks for a certificate
export const requestCertificate = async (req, res) => {
  try {
    const profile = await VolunteerProfile.findOne({ user: req.user._id });
    if (!profile?.verified) {
      return res.status(400).json({ message: "Your volunteer profile must be verified first" });
    }

    const pending = await Certificate.findOne({ volunteer: req.user._id, status: "Pending" });
    if (pending) return res.status(400).json({ message: "You already have a pending request" });

    const { hours } = await getStats(req.user._id);
    const min = certMinHours();
    if (hours < min) {
      return res.status(400).json({ message: `You need at least ${min} volunteer hours (you have ${hours})` });
    }

    // Each certificate must cover new hours since the last approved one
    const last = await Certificate.findOne({ volunteer: req.user._id, status: "Approved" }).sort({
      hoursAtRequest: -1,
    });
    if (last && hours <= last.hoursAtRequest) {
      return res.status(400).json({ message: "Log more hours to request another certificate" });
    }

    const certificate = await Certificate.create({ volunteer: req.user._id, hoursAtRequest: hours });

    notifyStaff(
      {
        type: "system",
        message: `${req.user.name} requested a volunteer certificate (${hours} h)`,
        link: "/admin/certificates",
      },
      req.user._id
    );
    res.status(201).json(certificate);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// GET /api/certificates/mine
export const getMyCertificates = async (req, res) => {
  try {
    const certificates = await Certificate.find({ volunteer: req.user._id }).sort({ createdAt: -1 });
    res.json(certificates);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/certificates?status=Pending  (admin)
export const getCertificates = async (req, res) => {
  try {
    const filter = req.query.status ? { status: req.query.status } : {};
    const certificates = await Certificate.find(filter)
      .sort({ createdAt: -1 })
      .populate("volunteer", "name email");
    res.json(certificates);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/certificates/:id/review  (admin)  body: { status: "Approved" | "Rejected", note }
export const reviewCertificate = async (req, res) => {
  try {
    const { status, note } = req.body;
    if (!["Approved", "Rejected"].includes(status)) {
      return res.status(400).json({ message: "Status must be Approved or Rejected" });
    }

    const certificate = await Certificate.findById(req.params.id);
    if (!certificate) return res.status(404).json({ message: "Certificate request not found" });
    if (certificate.status !== "Pending") {
      return res.status(400).json({ message: `Request is already ${certificate.status}` });
    }

    certificate.status = status;
    certificate.reviewNote = note;
    certificate.reviewedBy = req.user._id;
    certificate.reviewedAt = new Date();
    if (status === "Approved") {
      certificate.certificateNumber = `PC-${new Date().getFullYear()}-${crypto
        .randomBytes(3)
        .toString("hex")
        .toUpperCase()}`;
    }
    await certificate.save();

    notify(certificate.volunteer, {
      type: "system",
      message:
        status === "Approved"
          ? "Your volunteer certificate was approved. You can view and print it now."
          : `Your certificate request was not approved${note ? `: ${note}` : ""}`,
      link: status === "Approved" ? `/certificates/${certificate._id}` : "/volunteer",
      email: `Your certificate request was ${status.toLowerCase()}`,
    });
    res.json(certificate);
  } catch (error) {
    if (error.name === "CastError") return res.status(404).json({ message: "Certificate request not found" });
    res.status(400).json({ message: error.message });
  }
};

// GET /api/certificates/:id  - the owner (once approved) or staff
export const getCertificate = async (req, res) => {
  try {
    const certificate = await Certificate.findById(req.params.id)
      .populate("volunteer", "name email")
      .populate("reviewedBy", "name");
    if (!certificate) return res.status(404).json({ message: "Certificate not found" });

    const isOwner = sameId(certificate.volunteer._id, req.user._id);
    const isStaff = ["admin", "shelter_staff"].includes(req.user.role);
    if (!isOwner && !isStaff) return res.status(403).json({ message: "Not allowed to view this certificate" });
    if (isOwner && !isStaff && certificate.status !== "Approved") {
      return res.status(400).json({ message: "This certificate has not been approved yet" });
    }
    res.json(certificate);
  } catch (error) {
    if (error.name === "CastError") return res.status(404).json({ message: "Certificate not found" });
    res.status(500).json({ message: error.message });
  }
};