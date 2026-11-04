import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/User.js";

dotenv.config();

const [email, role = "admin"] = process.argv.slice(2);
const allowed = ["adopter", "volunteer", "shelter_staff", "veterinarian", "admin"];

if (!email || !allowed.includes(role)) {
  console.log(`Usage: node makeAdmin.js <email> [${allowed.join("|")}]`);
  process.exit(1);
}

await mongoose.connect(process.env.MONGO_URI);
const user = await User.findOneAndUpdate({ email }, { role }, { new: true });
console.log(user ? `${user.email} is now ${user.role}` : "User not found");
await mongoose.disconnect();