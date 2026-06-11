import { cloudinary } from '../config/cloudinary.js';

export const DEFAULT_PREVIEW_START_SEC = 30;
export const DEFAULT_PREVIEW_DURATION_SEC = 15;

const toFiniteNumber = (value, fallback) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

export const resolvePreviewWindow = (
    totalDurationSec,
    startSec = DEFAULT_PREVIEW_START_SEC,
    durationSec = DEFAULT_PREVIEW_DURATION_SEC,
) => {
    const totalDuration = Math.max(1, Math.floor(toFiniteNumber(totalDurationSec, DEFAULT_PREVIEW_DURATION_SEC)));
    const requestedDuration = Math.max(1, Math.floor(toFiniteNumber(durationSec, DEFAULT_PREVIEW_DURATION_SEC)));
    const previewDuration = Math.min(requestedDuration, totalDuration);
    const fallbackStart = totalDuration > previewDuration
        ? Math.min(DEFAULT_PREVIEW_START_SEC, totalDuration - previewDuration)
        : 0;
    const requestedStart = Math.max(0, Math.floor(toFiniteNumber(startSec, fallbackStart)));
    const previewStart = Math.min(requestedStart, Math.max(0, totalDuration - previewDuration));

    return {
        startSec: previewStart,
        durationSec: Math.max(1, Math.min(previewDuration, totalDuration - previewStart)),
    };
};

export const uploadAudioToCloudinary = (fileBuffer) => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                resource_type: 'video',
                folder: 'audlist/tracks',
            },
            (error, result) => {
                if (error) return reject(error);
                return resolve(result);
            },
        );

        uploadStream.end(fileBuffer);
    });
};

export const uploadImageToCloudinary = (fileBuffer) => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                resource_type: 'image',
                folder: 'audlist/products',
            },
            (error, result) => {
                if (error) return reject(error);
                return resolve(result);
            },
        );

        uploadStream.end(fileBuffer);
    });
};

export const buildPreviewUrl = (publicId, startSec, durationSec, totalDurationSec) => {
    const preview = resolvePreviewWindow(totalDurationSec, startSec, durationSec);

    return cloudinary.url(publicId, {
        resource_type: 'video',
        secure: true,
        format: 'mp3',
        transformation: [
            { start_offset: preview.startSec, duration: preview.durationSec },
        ],
    });
};
