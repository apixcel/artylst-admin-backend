import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    audienceType: {
      type: String,
      enum: ["fan", "artist", "admin", "business"],
      required: false,
      default: null,
    },
    isReaded: {
      type: Boolean,
      required: false,
      default: false,
    },
    auth: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Auth",
      required: false,
    },
  },
  { timestamps: true }
);

const Notification = mongoose.model("Notification", NotificationSchema);

export default Notification;
