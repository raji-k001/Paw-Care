import Pet from "../models/Pet.js";
import { uploadToCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";
import Shelter from "../models/Shelter.js";
import Movement from "../models/AnimalMovement.js";
import { canManagePet as canModify } from "../utils/access.js";
import mongoose from "mongoose";

const uploadImages = (files = []) => Promise.all(files.map((f) => uploadToCloudinary(f.buffer)));

// POST /api/pets
export const createPet = async (req, res) => {
  try {
    // shelter, careStatus, listed and images are set by the server, never by the client
    const fields = { ...req.body };
    ["shelterId", "shelter", "careStatus", "listed", "addedBy", "images"].forEach((k) => delete fields[k]);

    let shelter = null;
    if (req.user.role === "admin") {
      if (req.body.shelterId) {
        shelter = await Shelter.findById(req.body.shelterId);
        if (!shelter) return res.status(404).json({ message: "Shelter not found" });
      }
    } else if (req.user.shelter) {
      shelter = await Shelter.findById(req.user.shelter);
    }

    if (req.user.role !== "admin" && !shelter) {
      return res.status(403).json({ message: "You need an approved shelter before you can add pets" });
    }
    if (shelter) {
      if (shelter.status !== "Approved") {
        return res.status(400).json({ message: "This shelter has not been approved yet" });
      }
      const occupied = await Pet.countDocuments({ shelter: shelter._id, careStatus: { $ne: "Discharged" } });
      if (occupied >= shelter.capacity) {
        return res.status(400).json({ message: `${shelter.name} is full (${occupied} of ${shelter.capacity} places used)` });
      }
    }

    const images = await uploadImages(req.files);
    const pet = await Pet.create({ ...fields, images, addedBy: req.user._id, shelter: shelter?._id });

    if (shelter) {
      await Movement.create({
        shelter: shelter._id, pet: pet._id, type: "intake", reason: "new_listing", by: req.user._id,
      });
    }
    res.status(201).json(pet);
  } catch (error) {
    if (error.name === "CastError") return res.status(404).json({ message: "Shelter not found" });
    res.status(400).json({ message: error.message });
  }
};

// GET /api/pets?species=dog&location=chennai&page=1
export const getPets = async (req, res) => {
  try {
    const { species, gender, size, status, location, vaccinated, minAge, maxAge, search } =
      req.query;
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 12, 50);

    const filter = { listed: { $ne: false } };
    if (species) filter.species = species;
    if (gender) filter.gender = gender;
    if (size) filter.size = size;
    if (status) filter.status = status;
    if (vaccinated) filter.vaccinated = vaccinated === "true";
    if (location) filter.location = { $regex: location, $options: "i" };
    if (minAge || maxAge) {
      filter.age = {};
      if (minAge) filter.age.$gte = Number(minAge);
      if (maxAge) filter.age.$lte = Number(maxAge);
    }
    if (search) {
      const safe = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // stop regex tricks
      filter.$or = [
        { name: { $regex: safe, $options: "i" } },
        { breed: { $regex: safe, $options: "i" } },
      ];
    }

    const [pets, total] = await Promise.all([
      Pet.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("addedBy", "name"),
      Pet.countDocuments(filter),
    ]);

    res.json({ pets, page, pages: Math.ceil(total / limit), total });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/pets/:id
export const getPetById = async (req, res) => {
  try {
    const pet = await Pet.findById(req.params.id).populate("addedBy", "name email phone")  .populate("shelter", "name city phone email");
    if (!pet) return res.status(404).json({ message: "Pet not found" });
    res.json(pet);
  } catch (error) {
    // A badly formed id (CastError) simply means "not found"
    if (error.name === "CastError") return res.status(404).json({ message: "Pet not found" });
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/pets/:id
export const updatePet = async (req, res) => {
  try {
    const pet = await Pet.findById(req.params.id);
    if (!pet) return res.status(404).json({ message: "Pet not found" });
    if (!canModify(pet, req.user)) {
      return res.status(403).json({ message: "You can only edit pets you added" });
    }

    const newImages = await uploadImages(req.files);
    const updates = { ...req.body };
    ["addedBy", "images", "shelter", "shelterId", "careStatus", "listed"].forEach((k) => delete updates[k]);
    Object.assign(pet, updates);
    pet.images.push(...newImages);

    await pet.save(); // save() runs the schema validation again
    res.json(pet);
  } catch (error) {
    if (error.name === "CastError") return res.status(404).json({ message: "Pet not found" });
    res.status(400).json({ message: error.message });
  }
};

// DELETE /api/pets/:id
export const deletePet = async (req, res) => {
  try {
    const pet = await Pet.findById(req.params.id);
    if (!pet) return res.status(404).json({ message: "Pet not found" });
    if (!canModify(pet, req.user)) {
      return res.status(403).json({ message: "You can only delete pets you added" });
    }

    await Promise.all(pet.images.map((img) => deleteFromCloudinary(img.public_id)));
    await pet.deleteOne();
    res.json({ message: "Pet deleted" });
  } catch (error) {
    if (error.name === "CastError") return res.status(404).json({ message: "Pet not found" });
    res.status(500).json({ message: error.message });
  }
};

// GET /api/pets/compare?ids=a,b,c  (public) - 2 or 3 pets side by side
export const comparePets = async (req, res) => {
  try {
    const ids = [...new Set(String(req.query.ids || "").split(",").map((s) => s.trim()).filter(Boolean))];
    if (ids.length < 2 || ids.length > 3) {
      return res.status(400).json({ message: "Choose 2 or 3 pets to compare" });
    }
    if (!ids.every((id) => mongoose.isValidObjectId(id))) {
      return res.status(400).json({ message: "Invalid pet id" });
    }

    const pets = await Pet.find({ _id: { $in: ids }, listed: { $ne: false } }).populate("shelter", "name city");
    const byId = new Map(pets.map((p) => [p._id.toString(), p]));
    res.json(ids.map((id) => byId.get(id)).filter(Boolean)); // keep the order the user picked
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};