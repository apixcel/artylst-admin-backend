import mongoose from "mongoose";
import { AUTH_ROLES } from "../constants/auth.constant";

const AuthSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: AUTH_ROLES,
      required: true,
      default: "fan",
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
      select: 0,
    },
    userName: {
      type: String,
      required: true,
      unique: true,
    },
    isVerified: {
      type: Boolean,
      required: true,
      default: false,
    },
    otp: {
      type: {
        code: {
          type: Number,
        },
        coolDown: {
          type: Number,
        },
      },
      required: false,
      select: 0,
    },
    passwordChangedAt: {
      type: Date,
      required: false,
      select: 0,
    },
  },
  { timestamps: true }
);

const Auth = mongoose.model("Auth", AuthSchema);

export default Auth;
