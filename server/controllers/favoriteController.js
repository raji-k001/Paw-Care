import User from "../models/User.js";
import Pet from "../models/Pet.js";

const MAX_FAVORITES = 50;

// GET /api/favorites/ids  - just the ids, so every card can show a filled heart
export const getFavoriteIds = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("+favorites");
    res.json((user?.favorites || []).map(String));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/favorites  - the full pets
export const getFavorites = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select("+favorites")
      .populate({
        path: "favorites",
        match: { listed: { $ne: false } }, // pets that were removed from the public list drop out
        select: "name species breed age gender size location vaccinated status images",
      });
    res.json((user?.favorites || []).filter(Boolean));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/favorites/:petId
export const addFavorite = async (req, res) => {
  try {
    const pet = await Pet.findOne({ _id: req.params.petId, listed: { $ne: false } }).select("_id");
    if (!pet) return res.status(404).json({ message: "Pet not found" });

    // $addToSet never adds the same pet twice. "favorites.49 doesn't exist" means fewer than 50 saved.
    const result = await User.updateOne(
      { _id: req.user._id, "favorites.49": { $exists: false } },
      { $addToSet: { favorites: pet._id } }
    );
    if (result.matchedCount === 0) {
      return res.status(400).json({ message: `You can save up to ${MAX_FAVORITES} favorites` });
    }
    res.json({ message: "Saved to favorites" });
  } catch (error) {
    if (error.name === "CastError") return res.status(404).json({ message: "Pet not found" });
    res.status(500).json({ message: error.message });
  }
};

// DELETE /api/favorites/:petId
export const removeFavorite = async (req, res) => {
  try {
    await User.updateOne({ _id: req.user._id }, { $pull: { favorites: req.params.petId } });
    res.json({ message: "Removed from favorites" });
  } catch (error) {
    if (error.name === "CastError") return res.status(404).json({ message: "Pet not found" });
    res.status(500).json({ message: error.message });
  }
};