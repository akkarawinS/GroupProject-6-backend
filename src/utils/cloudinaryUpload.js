import { cloudinary } from '../config/cloudinary.js';

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

export const buildPreviewUrl = (publicId, startSec, durationSec) => {
    return cloudinary.url(publicId, {
        resource_type: 'video',
        secure: true,
        transformation: [
            { start_offset: startSec, duration: durationSec },
        ],
    });
};
