import mongoose from "mongoose";
import { STEAMING_PLATFORMS } from "../constants/StreamingConnection.constant";

const StreamingConnectionSchema = new mongoose.Schema(
  {
    artist: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Artist",
      required: true,
      index: true,
      unique: true, // one document per artist
    },
    spotify: {
      type: String,
      default: null,
    },
    appleMusic: {
      type: String,
      default: null,
    },
    youtubeMusic: {
      type: String,
      default: null,
    },
    soundcloud: {
      type: String,
      default: null,
    },
    defaultPlatform: {
      type: String,
      enum: STEAMING_PLATFORMS,
      required: false,
      default: null,
    },
  },
  { timestamps: true }
);

const StreamingConnection = mongoose.model("StreamingConnection", StreamingConnectionSchema);

export default StreamingConnection;
