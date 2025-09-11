import mongoose from "mongoose";
import { AUTH_GENDERS } from "../constants/auth.constant";

const ArtistSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
    },
    avatar: {
      type: String,
      required: false,
      default: null,
    },
    coverPhoto: {
      type: String,
      required: false,
      default: null,
    },
    bio: {
      type: String,
      required: false,
      default: null,
    },
    country: {
      type: String,
      required: false,
      default: null,
    },
    fullName: {
      type: String,
      required: true,
    },
    genre: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Genre",
      required: true,
      default: [],
    },
    gender: {
      type: String,
      enum: AUTH_GENDERS,
      required: true,
    },
    displayName: {
      type: String,
      required: true,
    },
    userName: {
      type: String,
      required: true,
      unique: true,
    },

    auth: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Auth",
    },
    dob: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

const Artist = mongoose.model("Artist", ArtistSchema);

export default Artist;
