import LostFoundReport from "../models/LostFoundReport.js";

const DAY = 24 * 60 * 60 * 1000;
export const EARTH_KM = 6378.1;
const STOP_WORDS = new Set(["and", "with", "the", "has"]);

// "Brown and white" -> { "brown", "white" }
export const words = (text) =>
  new Set(
    String(text || "")
      .toLowerCase()
      .split(/[^a-z]+/)
      .filter((w) => w.length > 2 && !STOP_WORDS.has(w))
  );

export const shareWord = (a, b) => {
  const other = words(b);
  return [...words(a)].some((w) => other.has(w));
};

// Distance in km between two [longitude, latitude] points (haversine formula)
export const distanceKm = ([lng1, lat1], [lng2, lat2]) => {
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.sqrt(h));
};

// Scores a lost report against a found report (either order). Returns null when they cannot match.
export const scoreMatch = (report, other) => {
  const lost = report.type === "lost" ? report : other;
  const found = report.type === "lost" ? other : report;

  if (lost.species !== found.species) return null;
  const gapDays = (new Date(found.date) - new Date(lost.date)) / DAY;
  if (gapDays < -1) return null; // it cannot be found before it was lost

  const km = distanceKm(lost.location.coordinates, found.location.coordinates);
  let score = 0;
  const reasons = [];

  const a = words(lost.color);
  const b = words(found.color);
  const shared = [...a].filter((w) => b.has(w));
  if (shared.length) {
    const full = shared.length === Math.min(a.size, b.size);
    score += full ? 30 : 18;
    reasons.push(full ? "Same colour" : "Similar colour");
  }

  const x = String(lost.breed || "").trim().toLowerCase();
  const y = String(found.breed || "").trim().toLowerCase();
  if (x && y && (x === y || x.includes(y) || y.includes(x))) {
    score += 20;
    reasons.push("Same breed");
  }

  if (lost.gender !== "unknown" && lost.gender === found.gender) {
    score += 10;
    reasons.push("Same gender");
  }
  if (lost.size && lost.size === found.size) {
    score += 10;
    reasons.push("Same size");
  }

  if (km <= 1) { score += 25; reasons.push("Within 1 km"); }
  else if (km <= 3) { score += 15; reasons.push("Within 3 km"); }
  else if (km <= 10) { score += 5; reasons.push("Within 10 km"); }

  if (gapDays <= 14) {
    score += 10;
    reasons.push("Found soon after it was lost");
  }

  return { score: Math.min(100, score), reasons, distanceKm: Math.round(km * 10) / 10 };
};

// Best matches among the opposite kind of report: open, same species, within 10 km and 60 days
export const findMatches = async (report, { limit = 5, minScore = 40 } = {}) => {
  const opposite = report.type === "lost" ? "found" : "lost";
  const time = new Date(report.date).getTime();

  const candidates = await LostFoundReport.find({
    type: opposite,
    status: "Open",
    hidden: { $ne: true },
    species: report.species,
    _id: { $ne: report._id },
    date: { $gte: new Date(time - 60 * DAY), $lte: new Date(time + 60 * DAY) },
    location: { $geoWithin: { $centerSphere: [report.location.coordinates, 10 / EARTH_KM] } },
  })
    .limit(100)
    .select("-contactedBy");

  const scored = [];
  for (const candidate of candidates) {
    const match = scoreMatch(report, candidate);
    if (match && match.score >= minScore) scored.push({ report: candidate, ...match });
  }
  return scored.sort((p, q) => q.score - p.score).slice(0, limit);
};