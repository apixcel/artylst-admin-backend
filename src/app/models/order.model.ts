import mongoose from "mongoose";
import { STEAMING_PLATFORMS } from "../constants/StreamingConnection.constant";

const OrderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: true,
      unique: true,
    },
    artist: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Artist",
      required: true,
    },
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: false,
    },
    maxRevision: {
      type: Number,
      required: false,
      default: 0,
    },

    price: {
      type: Number,
      required: true,
    },

    eta: {
      type: Date,
      required: false,
    },
    platform: {
      type: String,
      required: true,
      enum: STEAMING_PLATFORMS,
    },
    revision: {
      type: Number,
      required: true,
      default: 0,
    },
    status: {
      type: String,
      enum: [
        "pending",

        "accepted",
        "rejected",
        "in-revision",
        "completed",
        "disputed",
        "delivered",
      ],
      required: true,
      default: "pending",
    },
    deliveryWindow: {
      type: String,
    },
    note: {
      type: String,
      required: false,
    },
    deliveryInfo: {
      type: {
        email: {
          type: String,
          required: true,
        },
        name: {
          type: String,
          required: true,
        },
      },
      required: true,
    },
    addOn: {
      type: {
        label: {
          type: String,
          required: true,
        },
        price: {
          type: Number,
          required: true,
        },
      },
      required: false,
    },
    tierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Pricing",
      required: true,
    },
    tier: {
      type: String,
      required: true,
    },
    // more data will be added in future(if needed, unless remove this :')
  },
  { timestamps: true }
);

const Order = mongoose.model("Order", OrderSchema);

export default Order;
