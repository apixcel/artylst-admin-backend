import mongoose from "mongoose";

const PricingSchema = new mongoose.Schema(
  {
    artist: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Artist",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    songs: {
      type: Number,
      required: true,
    },
    priceUsd: {
      type: Number,
      required: true,
      min: 0,
    },
    deliveryTime: {
      type: String,
      required: true,
      // e.g. "7-10" or "3-5"
    },
    description: {
      type: [String],
      required: true,
      default: [],
    },
    revisionCount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    order: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Each artist shouldn’t have duplicate tier names
PricingSchema.index({ artist: 1, name: 1 }, { unique: true });

const Pricing = mongoose.model("Pricing", PricingSchema);

export default Pricing;
