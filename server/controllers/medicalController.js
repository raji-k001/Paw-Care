import MedicalRecord from "../models/medicalRecord.js";
import Pet from "../models/Pet.js";
import { uploadToCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";
import { sendDueReminders } from "../utils/reminders.js";
import { canManagePet, managedPetsFilter } from "../utils/access.js";

const DAY = 24 * 60 * 60 * 1000;
const TYPES = ["vaccination", "deworming", "checkup", "treatment", "surgery", "sterilization", "other"];
const sameId = (a, b) => a && b && a.toString() === b.toString();

// Admins and vets see every pet. Shelter staff see only the pets they listed.
const canAccess = (pet, user) =>
  ["admin", "veterinarian"].includes(user.role) || canManagePet(pet, user);

// Loads the pet from :petId and checks access. Sends the error itself and returns null on failure.
const getPetOrFail = async (req, res) => {
  let pet = null;
  try {
    pet = await Pet.findById(req.params.petId).select("+specialCare");
  } catch {
    // a badly formed id simply means "not found"
  }
  if (!pet) {
    res.status(404).json({ message: "Pet not found" });
    return null;
  }
  if (!canAccess(pet, req.user)) {
    res.status(403).json({ message: "You do not have access to this pet's medical records" });
    return null;
  }
  return pet;
};

// GET /api/medical/pets  - pets this user may open
export const listPets = async (req, res) => {
  try {
    const filter = req.user.role === "shelter_staff" ? managedPetsFilter(req.user) : {};
    const pets = await Pet.find(filter)
      .select("name species breed status images")
      .sort({ name: 1 })
      .limit(300);
    res.json(pets);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/medical/pets/:petId
export const getPetMedical = async (req, res) => {
  try {
    const pet = await getPetOrFail(req, res);
    if (!pet) return;

    const records = await MedicalRecord.find({ pet: pet._id })
      .sort({ date: -1, createdAt: -1 })
      .populate("recordedBy", "name role");

    res.json({
      pet: {
        _id: pet._id,
        name: pet.name,
        species: pet.species,
        sterilized: pet.sterilized,
        vaccinated: pet.vaccinated,
        specialCare: pet.specialCare || "",
      },
      records,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/medical/pets/:petId
export const addRecord = async (req, res) => {
  try {
    const pet = await getPetOrFail(req, res);
    if (!pet) return;

    const { type, title, date, diagnosis, treatment, medication, vetName, notes, nextDueDate } = req.body;
    if (!TYPES.includes(type)) return res.status(400).json({ message: "Choose a valid record type" });

    const recordDate = date ? new Date(date) : new Date();
    const due = nextDueDate ? new Date(nextDueDate) : undefined;
    if (isNaN(recordDate) || (due && isNaN(due))) {
      return res.status(400).json({ message: "Please enter valid dates" });
    }
    if (due && due < recordDate) {
      return res.status(400).json({ message: "The next due date must be after the record date" });
    }

    const documents = await Promise.all(
      (req.files || []).map((f) => uploadToCloudinary(f.buffer, "pawcare/medical"))
    );

    const record = await MedicalRecord.create({
      pet: pet._id,
      type, title, diagnosis, treatment, medication, notes,
      date: recordDate,
      nextDueDate: due,
      vetName: vetName || (req.user.role === "veterinarian" ? req.user.name : undefined),
      documents,
      recordedBy: req.user._id,
    });

    // Keep the public pet profile in sync, so the "Vaccinated" filter stays accurate
    let changed = false;
    if (type === "sterilization" && !pet.sterilized) { pet.sterilized = true; changed = true; }
    if (type === "vaccination" && !pet.vaccinated) { pet.vaccinated = true; changed = true; }
    if (changed) await pet.save();

    res.status(201).json(record);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// PUT /api/medical/pets/:petId/care  body: { sterilized, specialCare }
export const updateCare = async (req, res) => {
  try {
    const pet = await getPetOrFail(req, res);
    if (!pet) return;

    const { sterilized, specialCare } = req.body;
    if (sterilized !== undefined) pet.sterilized = sterilized === true || sterilized === "true";
    if (specialCare !== undefined) pet.specialCare = specialCare;
    await pet.save();

    res.json({ sterilized: pet.sterilized, specialCare: pet.specialCare || "" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// PUT /api/medical/records/:id/followup-done
export const completeFollowUp = async (req, res) => {
  try {
    const record = await MedicalRecord.findById(req.params.id).populate("pet", "addedBy");
    if (!record) return res.status(404).json({ message: "Record not found" });
    if (!record.pet || !canAccess(record.pet, req.user)) {
      return res.status(403).json({ message: "You do not have access to this record" });
    }

    record.followUpDone = true;
    await record.save();
    res.json(record);
  } catch (error) {
    if (error.name === "CastError") return res.status(404).json({ message: "Record not found" });
    res.status(500).json({ message: error.message });
  }
};

// DELETE /api/medical/records/:id  (admin only)
export const deleteRecord = async (req, res) => {
  try {
    const record = await MedicalRecord.findById(req.params.id);
    if (!record) return res.status(404).json({ message: "Record not found" });

    await Promise.all(record.documents.map((d) => deleteFromCloudinary(d.public_id)));
    await record.deleteOne();
    res.json({ message: "Record deleted" });
  } catch (error) {
    if (error.name === "CastError") return res.status(404).json({ message: "Record not found" });
    res.status(500).json({ message: error.message });
  }
};

// GET /api/medical/due  - follow-ups due within 30 days, plus anything overdue
export const getDue = async (req, res) => {
  try {
    const filter = { followUpDone: false, nextDueDate: { $lte: new Date(Date.now() + 30 * DAY) } };

    if (req.user.role === "shelter_staff") {
      const myPetIds = await Pet.find(managedPetsFilter(req.user)).distinct("_id");
      filter.pet = { $in: myPetIds };
    }

    const records = await MedicalRecord.find(filter).sort({ nextDueDate: 1 }).populate("pet", "name species");
    res.json(records);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/medical/run-reminders  (admin) - runs the daily job now, for testing
export const runRemindersNow = async (req, res) => {
  try {
    const count = await sendDueReminders();
    res.json({ message: `${count} reminder(s) sent`, count });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};