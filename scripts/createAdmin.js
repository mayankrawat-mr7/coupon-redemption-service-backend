import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import User from "../models/userModel.js";

const createAdmin = async () => {
  try {

    await mongoose.connect(process.env.MONGO_URI);
    const existingAdmin = await User.findOne({ role: "admin" });

    if (existingAdmin) {
      console.log("Admin user already exists.");
      process.exit(0);
    }

    const admin = await User.create({
      name: "Mayank",
      email: "mayank.rawat@seventhtriangle.com",
      phone: "8700089361",
      password: "Mayankrawat03",
      role: "admin",
    });

    console.log("Admin created:", admin.email);

    await mongoose.disconnect();
  } catch (error) {
    console.error("Error creating admin:", error.message);
    process.exit(1);
  }
};

createAdmin();
