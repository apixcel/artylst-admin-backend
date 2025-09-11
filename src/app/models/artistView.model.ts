import mongoose from "mongoose";

const ArtistViewSchema = new mongoose.Schema(
  {
    artist: { type: mongoose.Schema.Types.ObjectId, ref: "Artist", index: true, required: true },
    anonKey: { type: String, index: true, required: true }, // user id or unique identifier
  },
  {
    timestamps: true,
  }
);

const ArtistView = mongoose.model("ArtistView", ArtistViewSchema);
export default ArtistView;
