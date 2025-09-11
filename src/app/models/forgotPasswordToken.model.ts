import mongoose from "mongoose";

const forgotPasswordTokenSchema = new mongoose.Schema(
  {
    auth: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Auth",
      required: true,
    },

    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

const ForgotPasswordToken = mongoose.model("ForgotPasswordToken", forgotPasswordTokenSchema);

export default ForgotPasswordToken;
