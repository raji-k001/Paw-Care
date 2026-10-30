import Application from "../models/adoptionApplication.js";
import Pet from "../models/pet.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";
import { notify } from "../utils/notify.js";

const canReview = (pet, user) =>
  user.role === "admin" || pet.addedBy.toString() === user._id.toString();

// POST /api/applications
export const createApplication = async (req, res) => {
  try {
    const {
      petId, housingType, ownsHome, hasYard, householdSize,
      otherPets, experience, hoursAlonePerDay, reason,
    } = req.body;

    const pet = await Pet.findById(petId);
    if (!pet) return res.status(404).json({ message: "Pet not found" });
    if (pet.status === "Adopted") {
      return res.status(400).json({ message: "This pet has already been adopted" });
    }
    if (pet.addedBy.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: "You cannot apply for a pet you listed" });
    }

    const existing = await Application.findOne({
      pet: petId, applicant: req.user._id, status: "Pending",
    });
    if (existing) {
      return res.status(400).json({ message: "You already have a pending application for this pet" });
    }

    const documents = await Promise.all(
      (req.files || []).map((f) => uploadToCloudinary(f.buffer, "pawcare/documents"))
    );

    // We pick each field by name. We never spread req.body, so a user
    // cannot sneak in status: "Approved" themselves.
    const application = await Application.create({
      pet: petId,
      applicant: req.user._id,
      housingType, ownsHome, hasYard, householdSize,
      otherPets, experience, hoursAlonePerDay, reason,
      documents,
    });

    notify(pet.addedBy, {
  type: "application",
  message: `New adoption application for ${pet.name}`,
  link: "/staff/applications",
});

    res.status(201).json(application);
  } catch (error) {
    if (error.name === "CastError") return res.status(404).json({ message: "Pet not found" });
    res.status(400).json({ message: error.message });
  }
};

// GET /api/applications/my  - the applicant's own applications
export const getMyApplications = async (req, res) => {
  try {
    const applications = await Application.find({ applicant: req.user._id })
      .populate("pet", "name species images status")
      .sort({ createdAt: -1 });
    res.json(applications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/applications?status=Pending  - staff see their pets', admin sees all
export const getApplications = async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;

    if (req.user.role !== "admin") {
      const myPetIds = await Pet.find({ addedBy: req.user._id }).distinct("_id");
      filter.pet = { $in: myPetIds };
    }

    const applications = await Application.find(filter)
      .populate("pet", "name species images status")
      .populate("applicant", "name email phone")
      .sort({ createdAt: -1 });
    res.json(applications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/applications/:id
export const getApplicationById = async (req, res) => {
  try {
    const application = await Application.findById(req.params.id)
      .populate("pet")
      .populate("applicant", "name email phone");
    if (!application) return res.status(404).json({ message: "Application not found" });

    const isOwner = application.applicant._id.toString() === req.user._id.toString();
    if (!isOwner && !canReview(application.pet, req.user)) {
      return res.status(403).json({ message: "Not allowed to view this application" });
    }
    res.json(application);
  } catch (error) {
    if (error.name === "CastError") return res.status(404).json({ message: "Application not found" });
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/applications/:id/review  - staff or admin approves / rejects
 export const reviewApplication = async (req, res) => {
  try {
    const { status, rejectionReason, visitDate } = req.body;

    if (!["Approved", "Rejected"].includes(status)) {
      return res.status(400).json({ message: "Status must be Approved or Rejected" });
    }
    if (status === "Rejected" && !rejectionReason) {
      return res.status(400).json({ message: "A reason is required when rejecting" });
    }

    const application = await Application.findById(req.params.id).populate("pet");
    if (!application) return res.status(404).json({ message: "Application not found" });
    if (!canReview(application.pet, req.user)) {
      return res.status(403).json({ message: "You can only review applications for your own pets" });
    }
    if (application.status !== "Pending") {
      return res.status(400).json({ message: `Application is already ${application.status}` });
    }

    application.status = status;
    application.reviewedBy = req.user._id;
    application.reviewedAt = new Date();

    if (status === "Rejected") {
      application.rejectionReason = rejectionReason;
    } else {
      if (application.pet.status === "Adopted") {
        return res.status(400).json({ message: "This pet is already adopted" });
      }
      if (visitDate) application.visitDate = visitDate;

      // 1. Mark the pet as adopted
      application.pet.status = "Adopted";
      await application.pet.save();

      // 2. Find the other pending applicants first, so we can notify them
      const others = await Application.find({
        pet: application.pet._id,
        _id: { $ne: application._id },
        status: "Pending",
      }).select("applicant");

      // 3. Reject every other pending application for this pet
      await Application.updateMany(
        { pet: application.pet._id, _id: { $ne: application._id }, status: "Pending" },
        {
          status: "Rejected",
          rejectionReason: "Another application was approved for this pet",
          reviewedBy: req.user._id,
          reviewedAt: new Date(),
        }
      );

      // 4. Tell those applicants
      others.forEach((o) =>
        notify(o.applicant, {
          type: "application",
          message: `Your application for ${application.pet.name} was closed because another application was approved.`,
          link: "/my-applications",
        })
      );
    }

    await application.save();

    // Tell the applicant about the decision
    const petName = application.pet.name;
    notify(application.applicant, {
      type: "application",
      message:
        status === "Approved"
          ? `Good news! Your application for ${petName} was approved.${
              visitDate ? ` Visit date: ${new Date(visitDate).toLocaleDateString()}.` : ""
            }`
          : `Your application for ${petName} was not approved. Reason: ${rejectionReason}`,
      link: "/my-applications",
      email: `Your adoption application was ${status.toLowerCase()}`,
    });

    res.json(application);
  } catch (error) {
    if (error.name === "CastError") return res.status(404).json({ message: "Application not found" });
    res.status(400).json({ message: error.message });
  }
};
// PUT /api/applications/:id/withdraw  - applicant cancels
export const withdrawApplication = async (req, res) => {
  try {
    const application = await Application.findById(req.params.id);
    if (!application) return res.status(404).json({ message: "Application not found" });
    if (application.applicant.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "This is not your application" });
    }
    if (application.status !== "Pending") {
      return res.status(400).json({ message: "Only pending applications can be withdrawn" });
    }

    application.status = "Withdrawn";
    await application.save();
    res.json(application);
  } catch (error) {
    if (error.name === "CastError") return res.status(404).json({ message: "Application not found" });
    res.status(500).json({ message: error.message });
  }
};