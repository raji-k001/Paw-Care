import Pet from "../models/pet.js";
import { uploadToCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";

const uploadImages = (files = []) => Promise.all(files.map((f) => uploadToCloudinary(f.buffer)));

// Staff can only change their own pets. Admin can change any.
const canModify = (pet, user) =>
  user.role === "admin" || pet.addedBy.toString() === user._id.toString();

// POST /api/pets
export const createPet = async (req, res) => {
  try {
    const images = await uploadImages(req.files);
    const pet = await Pet.create({ ...req.body, images, addedBy: req.user._id });
    res.status(201).json(pet);
  } catch (error) {
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

    const filter = {};
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
    const pet = await Pet.findById(req.params.id).populate("addedBy", "name email phone");
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
    const { addedBy, images, ...updates } = req.body; // never let the client change these
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