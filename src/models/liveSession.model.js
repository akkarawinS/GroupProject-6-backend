import mongoose from "mongoose";

const liveSessionSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    artist_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, trim: true, required: true },
    description: { type: String, trim: true, default: "" },
    thumbnail_url: { type: String, trim: true, default: "" },
    provider: { type: String, enum: ["livekit"], default: "livekit" },
    livekit_room_name: { type: String, trim: true, required: true, unique: true },
    status: { type: String, enum: ["scheduled", "live", "ended"], default: "live", index: true },
    started_at: { type: Date, default: Date.now },
    ended_at: { type: Date, default: null },
}, { timestamps: true });

export const LiveSession = mongoose.model("LiveSession", liveSessionSchema);
