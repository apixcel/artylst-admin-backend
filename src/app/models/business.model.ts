import mongoose from "mongoose";

const BusinessSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
    },
    businessName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    genre: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Genre",
      required: true,
    },
    vibe: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vibe",
      required: true,
    },
    businessType: {
      type: String,
      required: true,
    },

    desirePlaylistLengthMinute: {
      type: Number,
      required: true,
    },
    desirePriceUsd: {
      type: Number,
      required: true,
    },
    useCase: {
      type: String,
      required: true,
    },
    avatar: {
      type: String,
      required: false,
      default: null,
    },
    auth: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Auth",
    },
  },
  { timestamps: true }
);

const Business = mongoose.model("Business", BusinessSchema);

export default Business;
