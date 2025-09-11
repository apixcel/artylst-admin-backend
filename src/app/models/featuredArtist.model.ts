import mongoose from "mongoose";

const FeaturedArtistSchema = new mongoose.Schema(
  {
    artist: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Artist",
      required: true,
    },

    // otherrr data will be added on future
  },
  { timestamps: true }
);

FeaturedArtistSchema.index({ artist: 1 }, { unique: true });

const FeaturedArtist = mongoose.model("FeaturedArtist", FeaturedArtistSchema);

export default FeaturedArtist;
