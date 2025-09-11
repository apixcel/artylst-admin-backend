import mongoose from "mongoose";

const VibeSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      required: true,
    },
    slug: {
      type: String,
      required: true,
      index: true,
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Vibe = mongoose.model("Vibe", VibeSchema);

export default Vibe;
