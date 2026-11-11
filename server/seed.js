import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/User.js";
import Shelter from "./models/Shelter.js";
import Pet from "./models/Pet.js";
import Movement from "./models/AnimalMovement.js";
import SupplyItem from "./models/SupplyItem.js";
import ShelterExpense from "./models/ShelterExpense.js";
import Application from "./models/AdoptionApplication.js";
import RescueRequest from "./models/RescueRequest.js";
import Campaign from "./models/Campaign.js";
import Donation from "./models/Donation.js";
import VolunteerProfile from "./models/VolunteerProfile.js";
import VolunteerTask from "./models/VolunteerTask.js";
import MedicalRecord from "./models/MedicalRecord.js";
import Notification from "./models/Notification.js";
import Certificate from "./models/Certificate.js";
import LostFoundReport from "./models/LostFoundReport.js";
import ContentFlag from "./models/ContentFlag.js";
import AuditLog from "./models/AuditLog.js";

dotenv.config();

const DOMAIN = "@demo.pawcare.test";
const PASSWORD = "Demo@1234";
const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (n) => new Date(Date.now() - n * DAY);
const daysFromNow = (n) => new Date(Date.now() + n * DAY);
const at = (date, hour) => {
  const d = new Date(date);
  d.setHours(hour, 0, 0, 0);
  return d;
};

// Removes everything connected to the demo accounts
const clean = async () => {
  const users = await User.find({ email: /@demo\.pawcare\.test$/ }).select("_id");
  const ids = users.map((u) => u._id);
  const shelterIds = (await Shelter.find({ owner: { $in: ids } }).select("_id")).map((s) => s._id);
  const petIds = (await Pet.find({ addedBy: { $in: ids } }).select("_id")).map((p) => p._id);

  await Promise.all([
    Movement.deleteMany({ $or: [{ shelter: { $in: shelterIds } }, { pet: { $in: petIds } }] }),
    SupplyItem.deleteMany({ shelter: { $in: shelterIds } }),
    ShelterExpense.deleteMany({ shelter: { $in: shelterIds } }),
    Application.deleteMany({ $or: [{ pet: { $in: petIds } }, { applicant: { $in: ids } }] }),
    MedicalRecord.deleteMany({ $or: [{ pet: { $in: petIds } }, { recordedBy: { $in: ids } }] }),
    RescueRequest.deleteMany({ reportedBy: { $in: ids } }),
    Donation.deleteMany({ donor: { $in: ids } }),
    Campaign.deleteMany({ createdBy: { $in: ids } }),
    VolunteerProfile.deleteMany({ user: { $in: ids } }),
    VolunteerTask.deleteMany({ $or: [{ assignedTo: { $in: ids } }, { createdBy: { $in: ids } }] }),
    Certificate.deleteMany({ volunteer: { $in: ids } }),
    Notification.deleteMany({ user: { $in: ids } }),
    LostFoundReport.deleteMany({ reportedBy: { $in: ids } }),
    ContentFlag.deleteMany({ reportedBy: { $in: ids } }),
    AuditLog.deleteMany({ actor: { $in: ids } }),
  ]);
  await Pet.deleteMany({ _id: { $in: petIds } });
  await Shelter.deleteMany({ _id: { $in: shelterIds } });
  await User.deleteMany({ _id: { $in: ids } });
};

const create = async () => {
  if (await User.exists({ email: `admin${DOMAIN}` })) {
    console.log("Demo data already exists. Run: node seed.js --reset");
    return;
  }

  const [admin, staff, vet, volunteer, adopter, adopter2] = await User.create([
    { name: "Demo Admin", email: `admin${DOMAIN}`, password: PASSWORD, role: "admin", phone: "+91 90000 00001" },
    { name: "Meena (Shelter staff)", email: `staff${DOMAIN}`, password: PASSWORD, role: "shelter_staff", phone: "+91 90000 00002" },
    { name: "Dr. Karthik (Vet)", email: `vet${DOMAIN}`, password: PASSWORD, role: "veterinarian", phone: "+91 90000 00003" },
    { name: "Priya (Volunteer)", email: `volunteer${DOMAIN}`, password: PASSWORD, role: "volunteer", phone: "+91 90000 00004" },
    { name: "Arun (Adopter)", email: `adopter${DOMAIN}`, password: PASSWORD, role: "adopter", phone: "+91 90000 00005" },
    { name: "Divya (Adopter)", email: `adopter2${DOMAIN}`, password: PASSWORD, role: "adopter", phone: "+91 90000 00006" },
  ]);

  const shelter = await Shelter.create({
    name: "Happy Paws Shelter (demo)",
    description: "A community shelter caring for rescued dogs, cats and small animals.",
    address: "12 Beach Road, Adyar", city: "Chennai", phone: "+91 90000 00010",
    email: `happypaws${DOMAIN}`, capacity: 20, status: "Approved",
    owner: staff._id, reviewedBy: admin._id, reviewedAt: daysAgo(160),
  });
  await User.updateOne({ _id: staff._id }, { shelter: shelter._id });

  // Pets: the last two are already adopted
  const PETS = [
    ["Bruno", "dog", "Labrador", 2, "male", "large", "golden", true],
    ["Luna", "cat", "Persian", 1, "female", "small", "white", true],
    ["Simba", "cat", "Indie", 1, "male", "medium", "orange", false],
    ["Rocky", "dog", "Indie", 3, "male", "medium", "brown", true],
    ["Mitti", "dog", "Indie", 1, "female", "small", "brown and white", true],
    ["Coco", "rabbit", "Dutch", 1, "female", "small", "black and white", false],
    ["Tara", "dog", "Beagle", 4, "female", "medium", "tricolour", true],
    ["Kitty", "cat", "Siamese", 2, "female", "small", "cream", true],
    ["Zorro", "dog", "German Shepherd", 5, "male", "large", "black and tan", true],
    ["Pappu", "bird", "Parakeet", 1, "unknown", "small", "green", false],
    ["Moti", "dog", "Indie", 2, "male", "medium", "white", true],
    ["Bella", "cat", "Indie", 3, "female", "small", "grey", true],
  ];
  const pets = await Pet.create(
    PETS.map(([name, species, breed, age, gender, size, color, vaccinated], i) => ({
      name, species, breed, age, gender, size, color, vaccinated,
      location: "Chennai",
      description: `${name} is a friendly ${species} looking for a loving home.`,
      shelter: shelter._id, addedBy: staff._id,
      sterilized: i % 3 === 0,
      status: i >= 10 ? "Adopted" : "Available",
      careStatus: i >= 10 ? "Discharged" : "In care",
      createdAt: daysAgo(150 - i * 11),
    }))
  );

  await Movement.insertMany([
    ...pets.map((p, i) => ({
      shelter: shelter._id, pet: p._id, type: "intake", reason: "new_listing", by: staff._id, date: daysAgo(150 - i * 11),
    })),
    { shelter: shelter._id, pet: pets[10]._id, type: "discharge", reason: "adopted", by: staff._id, date: daysAgo(40) },
    { shelter: shelter._id, pet: pets[11]._id, type: "discharge", reason: "adopted", by: staff._id, date: daysAgo(12) },
  ]);

  const base = {
    housingType: "house", ownsHome: true, hasYard: true, householdSize: 3, otherPets: false,
    hoursAlonePerDay: 3, experience: "Grew up with dogs and cats.",
    reason: "We would love to give this animal a safe and loving home.",
  };
  await Application.create([
    { ...base, pet: pets[10]._id, applicant: adopter._id, status: "Approved", reviewedBy: staff._id, reviewedAt: daysAgo(40), visitDate: daysAgo(38) },
    { ...base, pet: pets[11]._id, applicant: adopter2._id, status: "Approved", reviewedBy: staff._id, reviewedAt: daysAgo(12) },
    { ...base, pet: pets[0]._id, applicant: adopter._id }, // still pending
  ]);

  // Rescue reports spread over several months
  const spot = (i) => ({ type: "Point", coordinates: [80.2707 + (i % 3) * 0.01, 13.0827 + (i % 2) * 0.01] });
  const RESCUES = [
    ["dog", "injured", "Limping dog near the bus stop", "High", 150, "Resolved"],
    ["cat", "abandoned", "Kitten left in a cardboard box", "Medium", 120, "Resolved"],
    ["dog", "injured", "Dog hit by a two-wheeler", "Critical", 95, "Resolved"],
    ["dog", "abandoned", "Puppies found under a parked car", "Medium", 60, "Resolved"],
    ["cat", "injured", "Cat with a wounded paw", "High", 20, "In Progress"],
    ["dog", "injured", "Dog with a severe leg injury", "Critical", 2, "Reported"],
  ];
  await RescueRequest.create(
    RESCUES.map(([species, category, description, urgency, ago, status], i) => ({
      reportedBy: adopter._id, species, category, description, urgency, status, address: "Chennai",
      location: spot(i),
      assignedTo: status === "Reported" ? undefined : volunteer._id,
      assignedBy: status === "Reported" ? undefined : staff._id,
      resolutionNote: status === "Resolved" ? "Animal treated and taken to the shelter." : undefined,
      history: [{ status: "Reported", by: adopter._id, note: "Report submitted", at: daysAgo(ago) }],
      createdAt: daysAgo(ago),
    }))
  );

  // Campaigns and donations (demo payments, no real money)
  const [c1, c2] = await Campaign.create([
    {
      title: "Surgery for Bruno (demo)", category: "medical", goalAmount: 8000, raisedAmount: 1500,
      description: "Bruno was found limping after an accident. He needs leg surgery and about three weeks of rest. Every expense will be posted here with its bill.",
      endDate: daysFromNow(30), createdBy: staff._id,
      expenses: [{ description: "X-ray and blood tests", amount: 800, date: daysAgo(3), addedBy: staff._id }],
    },
    {
      title: "Winter food for our rescued dogs (demo)", category: "food", goalAmount: 15000, raisedAmount: 2250,
      description: "Our shelter feeds more than 40 rescued dogs every day. Your gift keeps their bowls full through the winter.",
      endDate: daysFromNow(45), createdBy: staff._id,
    },
  ]);
  await Donation.create([
    { campaign: c1._id, donor: adopter._id, amount: 500, status: "Paid", paidAt: daysAgo(10), receiptNumber: "PCR-DEMO-0001" },
    { campaign: c1._id, donor: adopter2._id, amount: 1000, status: "Paid", paidAt: daysAgo(6), receiptNumber: "PCR-DEMO-0002" },
    { campaign: c2._id, donor: adopter._id, amount: 250, status: "Paid", paidAt: daysAgo(75), receiptNumber: "PCR-DEMO-0003" },
    { campaign: c2._id, donor: adopter2._id, amount: 2000, status: "Paid", paidAt: daysAgo(40), receiptNumber: "PCR-DEMO-0004", anonymous: true },
  ]);

  // Volunteer
  await VolunteerProfile.create({
    user: volunteer._id, skills: ["first aid", "driving", "dog handling"], availableDays: ["Sat", "Sun"],
    preferredTime: "morning", city: "Chennai", bio: "Weekend volunteer.",
    verified: true, verifiedBy: admin._id, verifiedAt: daysAgo(30),
  });
  await VolunteerTask.create([
    {
      title: "Morning feeding", type: "feeding", location: "Happy Paws Shelter",
      startTime: at(daysAgo(5), 9), endTime: at(daysAgo(5), 12),
      assignedTo: volunteer._id, createdBy: staff._id, status: "Completed", hoursLogged: 3, completedAt: daysAgo(5),
    },
    {
      title: "Take Luna to the vet", type: "transportation",
      startTime: at(daysFromNow(1), 10), endTime: at(daysFromNow(1), 12),
      assignedTo: volunteer._id, createdBy: staff._id,
    },
  ]);

  // Shelter supplies and expenses
  await SupplyItem.create([
    { shelter: shelter._id, name: "Dog food", category: "food", quantity: 40, unit: "kg", lowStockThreshold: 10 },
    { shelter: shelter._id, name: "Antibiotics", category: "medicine", quantity: 3, unit: "strips", lowStockThreshold: 5 },
    { shelter: shelter._id, name: "Cat litter", category: "supplies", quantity: 12, unit: "packs", lowStockThreshold: 4 },
  ]);
  await ShelterExpense.create([
    { shelter: shelter._id, category: "food", amount: 3200, description: "Monthly dog food order", date: daysAgo(4), addedBy: staff._id },
    { shelter: shelter._id, category: "veterinary", amount: 1800, description: "Vaccinations for new arrivals", date: daysAgo(9), addedBy: staff._id },
  ]);

  // Medical records (one due soon, one overdue)
  await MedicalRecord.create([
    { pet: pets[0]._id, type: "vaccination", title: "Rabies vaccine", date: daysAgo(20), nextDueDate: daysFromNow(5), vetName: "Dr. Karthik", recordedBy: vet._id },
    { pet: pets[1]._id, type: "deworming", title: "Deworming dose", date: daysAgo(30), nextDueDate: daysAgo(2), vetName: "Dr. Karthik", recordedBy: vet._id },
    { pet: pets[3]._id, type: "checkup", title: "General check-up", date: daysAgo(8), diagnosis: "Healthy", vetName: "Dr. Karthik", recordedBy: vet._id },
  ]);

  // A lost and a found report that match each other
  await LostFoundReport.create([
    {
      type: "lost", reportedBy: adopter._id, species: "dog", name: "Tommy", breed: "Indie", color: "brown and white",
      gender: "male", size: "medium", description: "Tommy slipped out of the gate. He wears a red collar.",
      date: daysAgo(3), address: "Adyar bus depot", location: { type: "Point", coordinates: [80.2565, 13.0067] },
    },
    {
      type: "found", reportedBy: adopter2._id, species: "dog", breed: "Indie", color: "white with brown patches",
      gender: "male", size: "medium", description: "Friendly dog with a red collar found near the park.",
      date: daysAgo(2), address: "Adyar park", location: { type: "Point", coordinates: [80.258, 13.0075] },
    },
  ]);

  console.log("\nDemo data created. Log in with password:", PASSWORD);
  ["admin", "staff", "vet", "volunteer", "adopter", "adopter2"].forEach((n) => console.log(`  ${n}${DOMAIN}`));
};

if (process.env.NODE_ENV === "production" && !process.argv.includes("--force")) {
  console.log("Refusing to seed in production. Add --force if you really mean it.");
  process.exit(1);
}

await mongoose.connect(process.env.MONGO_URI);
console.log("Database:", mongoose.connection.name);

if (process.argv.includes("--clean")) {
  await clean();
  console.log("Demo data removed.");
} else {
  if (process.argv.includes("--reset")) await clean();
  await create();
}
await mongoose.disconnect();