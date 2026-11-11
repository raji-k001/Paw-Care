import mongoose from "mongoose";
import dotenv from "dotenv";
import Shelter from "./models/Shelter.js";
import Pet from "./models/Pet.js";

dotenv.config();

const name = process.argv[2];
if (!name) {
  console.log('Usage: node assignPets.js "Shelter name"');
  process.exit(1);
}

await mongoose.connect(process.env.MONGO_URI);
const shelter = await Shelter.findOne({ name, status: "Approved" });
if (!shelter) {
  console.log("No approved shelter with that name");
} else {
  const result = await Pet.updateMany({ shelter: null }, { shelter: shelter._id });
  console.log(`${result.modifiedCount} pet(s) moved into ${shelter.name} (capacity ${shelter.capacity})`);
}
await mongoose.disconnect();