import mongoose from "mongoose";

const ReviewSchema = new mongoose.Schema(
  {
    artist: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Artist",
      required: true,
      index: true,
    },
    fan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Fan",
      required: true,
      index: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
  },
  { timestamps: true }
);

// a user can only give a artist review once
ReviewSchema.index({ artist: 1, fan: 1 }, { unique: true });

const Review = mongoose.model("Review", ReviewSchema);

export default Review;
