import mongoose from "mongoose";

const FanSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: true,
    },
    userName: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    avatar: {
      type: String,
      required: false,
    },
  },
  { timestamps: true }
);

const Fan = mongoose.model("Fan", FanSchema);

export default Fan;
