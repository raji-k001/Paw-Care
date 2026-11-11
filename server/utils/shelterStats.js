import Pet from "../models/Pet.js";

const inCare = { careStatus: { $ne: "Discharged" } };

// How many animals a shelter currently has
export const occupancyOf = (shelterId) => Pet.countDocuments({ shelter: shelterId, ...inCare });

// Map of shelterId -> animals currently in care, for list pages
export const occupancyMap = async () => {
  const rows = await Pet.aggregate([
    { $match: { shelter: { $ne: null }, ...inCare } },
    { $group: { _id: "$shelter", count: { $sum: 1 } } },
  ]);
  return new Map(rows.map((r) => [r._id.toString(), r.count]));
};