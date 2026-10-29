import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/user.js";

dotenv.config();

const email = process.argv[2];

await mongoose.connect(process.env.MONGO_URI);
const user = await User.findOneAndUpdate({ email }, { role: "admin" }, { new: true });
console.log(user ? `${user.email} is now ${user.role}` : "User not found");
await mongoose.disconnect();