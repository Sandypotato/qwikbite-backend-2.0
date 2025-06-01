import mongoose from "mongoose";



const imageSubSchema = new mongoose.Schema(
  {
    url:       { type: String, required: true },
    public_id: { type: String, required: true }
  },
  { _id: false }
);

const foodSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  image: { type: imageSubSchema, required: true },
  category: { type: String, required: true },
});

const foodModel=mongoose.models.food || mongoose.model("food",foodSchema);

export default foodModel;
