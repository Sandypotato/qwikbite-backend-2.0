// controllers/foodController.js
import dotenv from 'dotenv'
dotenv.config();
import foodModel from "../models/foodModel.js";
import userModel from "../models/userModel.js";
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import path from "path";

// ⚙️ Configure Cloudinary using environment variables
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key:    process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

// ----------------------
// Add Food Item
// ----------------------
const addFood = async (req, res) => {
  try {
    // 1) Verify that the user is an admin
    const userData = await userModel.findById(req.body.userId);
    if (!userData || userData.role !== "admin") {
      return res
        .status(403)
        .json({ success: false, message: "You are not admin" });
    }

    // 2) Make sure req.file is present (Multer should have processed it)
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "Image file is required" });
    }

    // 3) Upload to Cloudinary
    //    We assume Multer stored the file on disk at req.file.path
    const localFilePath = req.file.path;

    const uploadResult = await cloudinary.uploader.upload(localFilePath, {
      folder: "food-items", // optional: put all food images in a "food-items" folder
      overwrite: true,
      resource_type: "image",
    });

    // 4) Delete the temporary file from `uploads/`
    fs.unlink(localFilePath, (err) => {
      if (err) console.warn("Could not delete temporary file:", err);
    });

    // 5) Create & save the new food document, storing the Cloudinary URL + public_id
    const food = new foodModel({
      name:        req.body.name,
      description: req.body.description,
      price:       req.body.price,
      category:    req.body.category,
      image: {
        url:       uploadResult.secure_url,
        public_id: uploadResult.public_id,
      },
    });

    await food.save();
    return res.json({ success: true, message: "Food Added", data: food });
  } catch (error) {
    console.error("addFood error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error." });
  }
};

// ----------------------
// List All Foods
// ----------------------
const listFood = async (req, res) => {
  try {
    const foods = await foodModel.find({});
    return res.json({ success: true, data: foods });
  } catch (error) {
    console.error("listFood error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error." });
  }
};

// ----------------------
// Remove Food Item
// ----------------------
const removeFood = async (req, res) => {
  try {
    // 1) Verify that the user is an admin
    const userData = await userModel.findById(req.body.userId);
    if (!userData || userData.role !== "admin") {
      return res
        .status(403)
        .json({ success: false, message: "You are not admin" });
    }

    // 2) Find the food item
    const food = await foodModel.findById(req.body.id);
    if (!food) {
      return res
        .status(404)
        .json({ success: false, message: "Food item not found" });
    }

    // 3) If we stored a public_id, delete the image from Cloudinary
    if (food.image && food.image.public_id) {
      try {
        await cloudinary.uploader.destroy(food.image.public_id);
      } catch (err) {
        console.warn(
          `Could not delete Cloudinary image ${food.image.public_id}:`,
          err
        );
        // We do not block the request if Cloudinary deletion fails.
      }
    }

    // 4) Delete the food document from MongoDB
    await foodModel.findByIdAndDelete(req.body.id);
    return res.json({ success: true, message: "Food Removed" });
  } catch (error) {
    console.error("removeFood error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error." });
  }
};

export { addFood, listFood, removeFood };
