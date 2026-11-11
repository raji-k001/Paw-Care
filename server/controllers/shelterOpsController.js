import Shelter from "../models/Shelter.js";
import Pet from "../models/Pet.js";
import User from "../models/user.js";
import Movement from "../models/AnimalMovement.js";
import SupplyItem from "../models/SupplyItem.js";
import ShelterExpense from "../models/ShelterExpense.js";
import { notify } from "../utils/notify.js";
import { canRunShelter } from "../utils/access.js";
import { occupancyOf } from "../utils/shelterStats.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";

const IST_MS = 5.5 * 60 * 60 * 1000;
const round = (n) => Math.round(n * 100) / 100;

// Loads :id, checks access and approval. Sends the error itself and returns null on failure.
const getManagedShelter = async (req, res) => {
  let shelter = null;
  try {
    shelter = await Shelter.findById(req.params.id);
  } catch {
    // a badly formed id simply means "not found"
  }
  if (!shelter) {
    res.status(404).json({ message: "Shelter not found" });
    return null;
  }
  if (!canRunShelter(req.user, shelter._id)) {
    res.status(403).json({ message: "You can only manage your own shelter" });
    return null;
  }
  if (shelter.status !== "Approved") {
    res.status(400).json({ message: "This shelter has not been approved yet" });
    return null;
  }
  return shelter;
};

const notifyShelter = async (shelterId, payload) => {
  const staff = await User.find({ shelter: shelterId, role: "shelter_staff" }).select("_id");
  staff.forEach((s) => notify(s._id, payload));
};

// "2026-11" -> the start and end of that month in India time
const parseMonth = (value) => {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(value || "");
  const now = new Date(Date.now() + IST_MS);
  const year = match ? Number(match[1]) : now.getUTCFullYear();
  const month = match ? Number(match[2]) - 1 : now.getUTCMonth();
  return {
    key: `${year}-${String(month + 1).padStart(2, "0")}`,
    start: new Date(Date.UTC(year, month, 1) - IST_MS),
    end: new Date(Date.UTC(year, month + 1, 1) - IST_MS),
  };
};

// ---------- Animals, transfers, discharge ----------

// GET /api/shelters/:id/animals
export const getAnimals = async (req, res) => {
  try {
    const shelter = await getManagedShelter(req, res);
    if (!shelter) return;
    const animals = await Pet.find({ shelter: shelter._id, careStatus: { $ne: "Discharged" } })
      .select("name species breed status images createdAt")
      .sort({ name: 1 });
    res.json(animals);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/shelters/:id/transfer  body: { petId, toShelterId, note }
export const transferPet = async (req, res) => {
  try {
    const shelter = await getManagedShelter(req, res);
    if (!shelter) return;

    const { petId, toShelterId, note } = req.body;
    const pet = await Pet.findOne({ _id: petId, shelter: shelter._id, careStatus: { $ne: "Discharged" } });
    if (!pet) return res.status(404).json({ message: "That animal is not in your shelter's care" });
    if (pet.status === "Adopted") return res.status(400).json({ message: "Adopted animals cannot be transferred" });
    if (String(toShelterId) === shelter._id.toString()) {
      return res.status(400).json({ message: "Choose a different shelter" });
    }

    const dest = await Shelter.findOne({ _id: toShelterId, status: "Approved" });
    if (!dest) return res.status(404).json({ message: "Destination shelter not found" });
    if ((await occupancyOf(dest._id)) >= dest.capacity) {
      return res.status(400).json({ message: `${dest.name} is full` });
    }

    pet.shelter = dest._id;
    await pet.save();

    const base = { pet: pet._id, fromShelter: shelter._id, toShelter: dest._id, note, by: req.user._id };
    await Movement.insertMany([
      { ...base, shelter: shelter._id, type: "transfer_out" },
      { ...base, shelter: dest._id, type: "transfer_in" },
    ]);

    notifyShelter(dest._id, {
      type: "system",
      message: `${pet.name} was transferred to ${dest.name} from ${shelter.name}`,
      link: "/shelter",
    });
    res.json({ message: `${pet.name} moved to ${dest.name}` });
  } catch (error) {
    if (error.name === "CastError") return res.status(404).json({ message: "Animal or shelter not found" });
    res.status(400).json({ message: error.message });
  }
};

// POST /api/shelters/:id/discharge  body: { petId, reason, note }
export const dischargePet = async (req, res) => {
  try {
    const shelter = await getManagedShelter(req, res);
    if (!shelter) return;

    const { petId, reason, note } = req.body;
    if (!["returned_to_owner", "released", "deceased", "other"].includes(reason)) {
      return res.status(400).json({ message: "Choose a reason" });
    }
    if (reason === "other" && !note?.trim()) {
      return res.status(400).json({ message: "Please add a note for this reason" });
    }

    const pet = await Pet.findOne({ _id: petId, shelter: shelter._id, careStatus: { $ne: "Discharged" } });
    if (!pet) return res.status(404).json({ message: "That animal is not in your shelter's care" });

    pet.careStatus = "Discharged";
    pet.listed = false; // gone from the public list (adoptions are handled separately)
    await pet.save();

    await Movement.create({
      shelter: shelter._id, pet: pet._id, type: "discharge", reason, note, by: req.user._id,
    });
    res.json({ message: `${pet.name} was discharged` });
  } catch (error) {
    if (error.name === "CastError") return res.status(404).json({ message: "Animal not found" });
    res.status(400).json({ message: error.message });
  }
};

// GET /api/shelters/:id/movements  - the 30 most recent
export const getMovements = async (req, res) => {
  try {
    const shelter = await getManagedShelter(req, res);
    if (!shelter) return;
    const moves = await Movement.find({ shelter: shelter._id })
      .sort({ date: -1 })
      .limit(30)
      .populate("pet", "name")
      .populate("fromShelter", "name")
      .populate("toShelter", "name");
    res.json(moves);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ---------- Supplies ----------

// GET /api/shelters/:id/supplies
export const getSupplies = async (req, res) => {
  try {
    const shelter = await getManagedShelter(req, res);
    if (!shelter) return;
    res.json(await SupplyItem.find({ shelter: shelter._id }).sort({ category: 1, name: 1 }));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/shelters/:id/supplies
export const addSupply = async (req, res) => {
  try {
    const shelter = await getManagedShelter(req, res);
    if (!shelter) return;

    const { name, category, quantity, unit, lowStockThreshold, expiryDate } = req.body;
    const qty = Number(quantity ?? 0);
    const threshold = Number(lowStockThreshold ?? 5);
    if (!name?.trim()) return res.status(400).json({ message: "Please enter the item name" });
    if (!Number.isFinite(qty) || qty < 0 || !Number.isFinite(threshold) || threshold < 0) {
      return res.status(400).json({ message: "Quantity and low-stock level must be 0 or more" });
    }

    const item = await SupplyItem.create({
      shelter: shelter._id, name, category,
      quantity: round(qty), unit: unit || "units", lowStockThreshold: threshold,
      expiryDate: expiryDate || undefined,
      updatedBy: req.user._id,
    });
    res.status(201).json(item);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// PUT /api/shelters/:id/supplies/:itemId/adjust  body: { change }  (+ adds stock, - uses stock)
export const adjustSupply = async (req, res) => {
  try {
    const shelter = await getManagedShelter(req, res);
    if (!shelter) return;

    const change = Number(req.body.change);
    if (!Number.isFinite(change) || change === 0) {
      return res.status(400).json({ message: "Enter a number other than 0" });
    }

    const item = await SupplyItem.findOne({ _id: req.params.itemId, shelter: shelter._id });
    if (!item) return res.status(404).json({ message: "Item not found" });

    const next = round(item.quantity + change);
    if (next < 0) return res.status(400).json({ message: `Only ${item.quantity} ${item.unit} in stock` });

    item.quantity = next;
    item.updatedBy = req.user._id;

    if (next <= item.lowStockThreshold && !item.lowStockNotified) {
      item.lowStockNotified = true; // alert once, until the stock is refilled
      notifyShelter(shelter._id, {
        type: "system",
        message: `Low stock: ${item.name} is down to ${next} ${item.unit}`,
        link: "/shelter",
      });
    } else if (next > item.lowStockThreshold) {
      item.lowStockNotified = false;
    }

    await item.save();
    res.json(item);
  } catch (error) {
    if (error.name === "CastError") return res.status(404).json({ message: "Item not found" });
    res.status(400).json({ message: error.message });
  }
};

// DELETE /api/shelters/:id/supplies/:itemId
export const deleteSupply = async (req, res) => {
  try {
    const shelter = await getManagedShelter(req, res);
    if (!shelter) return;
    await SupplyItem.deleteOne({ _id: req.params.itemId, shelter: shelter._id });
    res.json({ message: "Item removed" });
  } catch (error) {
    if (error.name === "CastError") return res.status(404).json({ message: "Item not found" });
    res.status(500).json({ message: error.message });
  }
};

// ---------- Expenses ----------

// GET /api/shelters/:id/expenses?month=2026-11
export const getExpenses = async (req, res) => {
  try {
    const shelter = await getManagedShelter(req, res);
    if (!shelter) return;

    const filter = { shelter: shelter._id };
    if (req.query.month) {
      const { start, end } = parseMonth(req.query.month);
      filter.date = { $gte: start, $lt: end };
    }
    const expenses = await ShelterExpense.find(filter).sort({ date: -1 }).populate("addedBy", "name");
    res.json({ expenses, total: expenses.reduce((sum, e) => sum + e.amount, 0) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/shelters/:id/expenses
export const addExpense = async (req, res) => {
  try {
    const shelter = await getManagedShelter(req, res);
    if (!shelter) return;

    const { category, description, date } = req.body;
    const amount = Number(req.body.amount);
    if (!Number.isInteger(amount) || amount < 1) {
      return res.status(400).json({ message: "Enter the amount as a whole number of rupees" });
    }

    const receipt = req.file ? await uploadToCloudinary(req.file.buffer, "pawcare/shelter-expenses") : undefined;
    const expense = await ShelterExpense.create({
      shelter: shelter._id, category, description, amount,
      date: date || undefined, receipt, addedBy: req.user._id,
    });
    res.status(201).json(expense);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// ---------- Monthly report ----------

// GET /api/shelters/:id/report?month=2026-11
export const getReport = async (req, res) => {
  try {
    const shelter = await getManagedShelter(req, res);
    if (!shelter) return;

    const { key, start, end } = parseMonth(req.query.month);
    const inMonth = { shelter: shelter._id };

    const [moves, spend, occupied, lowStock] = await Promise.all([
      Movement.aggregate([
        { $match: { ...inMonth, date: { $gte: start, $lt: end } } },
        { $group: { _id: { type: "$type", reason: "$reason" }, count: { $sum: 1 } } },
      ]),
      ShelterExpense.aggregate([
        { $match: { ...inMonth, date: { $gte: start, $lt: end } } },
        { $group: { _id: "$category", total: { $sum: "$amount" } } },
      ]),
      occupancyOf(shelter._id),
      SupplyItem.find({ shelter: shelter._id, $expr: { $lte: ["$quantity", "$lowStockThreshold"] } }).select(
        "name quantity unit lowStockThreshold"
      ),
    ]);

    const countOf = (type) => moves.filter((m) => m._id.type === type).reduce((s, m) => s + m.count, 0);
    const discharges = {};
    moves
      .filter((m) => m._id.type === "discharge")
      .forEach((m) => {
        discharges[m._id.reason || "other"] = m.count;
      });
    const byCategory = Object.fromEntries(spend.map((r) => [r._id, r.total]));

    res.json({
      month: key,
      shelterName: shelter.name,
      occupancy: { occupied, capacity: shelter.capacity },
      intakes: countOf("intake"),
      transfersIn: countOf("transfer_in"),
      transfersOut: countOf("transfer_out"),
      adoptions: discharges.adopted || 0,
      discharges,
      totalDischarges: countOf("discharge"),
      expenses: { total: spend.reduce((s, r) => s + r.total, 0), byCategory },
      lowStock,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};