import mongoose from "mongoose";

const TrackSchema = new mongoose.Schema(
    {
        artist: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        title: { type: String, trim: true, required: true },
        durationSec: { type: Number, required: true, min: 1 },
        audioUrl: {
            public_id: { type: String, required: true },
            url: { type: String, required: true }
        },
        previewStartSec: { type: Number, default: 30, min: 0 },
        previewDurationSec: { type: Number, default: 15, min: 1 },
        isStreamable: { type: Boolean, default: true }
    }, { timestamps: true },
)

export const Track = mongoose.model('Track', TrackSchema)