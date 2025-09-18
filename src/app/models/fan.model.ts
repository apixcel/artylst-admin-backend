import mongoose from "mongoose";

const FanSchema = new mongoose.Schema(
  {
    fullName: {
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
      required: true,
    },
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
  },
  { timestamps: true }
);

const Fan = mongoose.model("Fan", FanSchema);

export default Fan;
