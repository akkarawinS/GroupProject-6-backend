import mongoose from 'mongoose';
import { Product } from '../models/product.model.js'
import { Track } from '../models/track.model.js';
import { uploadAudioToCloudinary, uploadImageToCloudinary } from '../utils/cloudinaryUpload.js';
import { formatProduct } from '../utils/productFormatter.js'
import { createUniqueProductSlug } from "../utils/productSlug.js";

export const productPopulate = [
    { path: 'artist', select: 'username display_name profile_picture bio role' },
    { path: 'tracks' },
];


export const getAllProductInfo = async (req, res, next) => {
    try {
        const product = await Product.find({ deletedAt: null }).populate(productPopulate);

        return res.status(200).json({ success: true, data: product.map(formatProduct) });
    }
    catch (err) {
        next(err);
    }
};

export const getProductById = async (req, res, next) => {
    try {
        const { productId } = req.params;
        const query = mongoose.Types.ObjectId.isValid(productId) ? { _id: productId } : { slug: productId };
        const product = await Product.findOne(query).populate(productPopulate);

        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }
        return res.status(200).json({ success: true, data: formatProduct(product) });
    }
    catch (err) {
        next(err);
    }
};

export const createSingleProduct = async (req, res, next) => {
    const session = await mongoose.startSession();

    try {
        const { title, description, price, nameYourPrice } = req.body || {};

        const isNameYourPrice = nameYourPrice === 'true' || nameYourPrice === true;

        if (!title) {
            return res.status(400).json({ success: false, message: 'Title is required' });
        }

        if (!description) {
            return res.status(400).json({ success: false, message: 'Description is required' });
        }

        if (price === undefined || price === '') {
            return res.status(400).json({ success: false, message: 'Price is required' });
        }

        const productPrice = Number(price);
        const productMinPrice = isNameYourPrice ? productPrice : undefined;

        if (!Number.isFinite(productPrice) || productPrice < 0) {
            return res.status(400).json({ success: false, message: 'Price must be a valid number' });
        }

        const audioFile = req.files?.audio?.[0];
        const coverFile = req.files?.cover?.[0];

        if (!audioFile) {
            return res.status(400).json({ success: false, message: 'Audio file is required' });
        }

        if (!coverFile) {
            return res.status(400).json({ success: false, message: 'Cover image is required' });
        }
        const audioUpload = await uploadAudioToCloudinary(audioFile.buffer);
        const coverUpload = await uploadImageToCloudinary(coverFile.buffer);

        let createdProduct;

        await session.withTransaction(async () => {
            const durationSec = Math.ceil(audioUpload.duration);
            const slug = await createUniqueProductSlug(title);

            const [track] = await Track.create(
                [
                    {
                        artist: req.user.user_Id,
                        title,
                        durationSec,
                        audioUrl: {
                            public_id: audioUpload.public_id,
                            url: audioUpload.secure_url,
                        },
                    },
                ],
                { session },
            );
            const [product] = await Product.create(
                [
                    {
                        artist: req.user.user_Id,
                        type: 'single',
                        title,
                        slug,
                        description,
                        price: productPrice,
                        minPrice: isNameYourPrice ? productMinPrice : undefined,
                        coverUrl: {
                            public_id: coverUpload.public_id,
                            url: coverUpload.secure_url,
                        },
                        nameYourPrice: isNameYourPrice,
                        tracks: [track._id],
                    },
                ],
                { session },
            );

            createdProduct = product;

        });
        const populatedProduct = await Product.findById(createdProduct._id).populate(productPopulate);

        return res.status(201).json({ success: true, data: formatProduct(populatedProduct) });

    } catch (err) {
        next(err);
    } finally {
        await session.endSession();
    }
};

export const createAlbumProduct = async (req, res, next) => {
    const session = await mongoose.startSession();

    try {
        const { title, description, price, nameYourPrice, trackTitles } = req.body || {};

        const isNameYourPrice = nameYourPrice === 'true' || nameYourPrice === true;

        if (!title) {
            return res.status(400).json({ success: false, message: 'Title is required' });
        }

        if (!description) {
            return res.status(400).json({ success: false, message: 'Description is required' });
        }

        if (price === undefined || price === '') {
            return res.status(400).json({ success: false, message: 'Price is required' });
        }

        const productPrice = Number(price);
        const productMinPrice = isNameYourPrice ? productPrice : undefined;

        if (!Number.isFinite(productPrice) || productPrice < 0) {
            return res.status(400).json({ success: false, message: 'Price must be a valid number' });
        }

        const audioFiles = req.files?.audio || [];
        const coverFile = req.files?.cover?.[0];
        let requestedTrackTitles = [];

        if (trackTitles) {
            try {
                requestedTrackTitles = JSON.parse(trackTitles);
            } catch (err) {
                return res.status(400).json({ success: false, message: 'Track titles must be valid JSON' });
            }

            if (!Array.isArray(requestedTrackTitles)) {
                return res.status(400).json({ success: false, message: 'Track titles must be an array' });
            }
        }

        if (audioFiles.length < 2) {
            return res.status(400).json({
                success: false,
                message: 'Add at least 2 tracks for an album',
            });
        }
        if (!coverFile) {
            return res.status(400).json({ success: false, message: 'Cover image is required' });
        }
        const audioUploads = await Promise.all(
            audioFiles.map((file) => uploadAudioToCloudinary(file.buffer)),
        );
        const coverUpload = await uploadImageToCloudinary(coverFile.buffer);


        let createdProduct;

        await session.withTransaction(async () => {
            const slug = await createUniqueProductSlug(title);

            const tracksData = audioUploads.map((audioUpload, index) => ({
                artist: req.user.user_Id,
                title: (requestedTrackTitles[index] || audioFiles[index].originalname
                    .replace(/\.[^/.]+$/, '')
                    .replace(/[_-]+/g, ' ')
                    .trim()),
                durationSec: Math.ceil(audioUpload.duration),
                audioUrl: {
                    public_id: audioUpload.public_id,
                    url: audioUpload.secure_url,
                },
            }));

            const tracks = await Track.create(tracksData, { session });

            const [product] = await Product.create(
                [
                    {
                        artist: req.user.user_Id,
                        type: 'album',
                        title,
                        slug,
                        description,
                        price: productPrice,
                        minPrice: isNameYourPrice ? productMinPrice : undefined,
                        coverUrl: {
                            public_id: coverUpload.public_id,
                            url: coverUpload.secure_url,
                        },
                        nameYourPrice: isNameYourPrice,
                        tracks: tracks.map((track) => track._id),
                    },
                ],
                { session },
            );

            createdProduct = product;

        });
        const populatedProduct = await Product.findById(createdProduct._id).populate(productPopulate);

        return res.status(201).json({ success: true, data: formatProduct(populatedProduct) });

    } catch (err) {
        next(err);
    } finally {
        await session.endSession();
    }
}

export const createMerchProduct = async (req, res, next) => {
    try {
        const { title, description, price, merchType } = req.body || {};

        if (!title) {
            return res.status(400).json({ success: false, message: 'Title is required' });
        }

        if (!description) {
            return res.status(400).json({ success: false, message: 'Description is required' });
        }

        if (price === undefined || price === '') {
            return res.status(400).json({ success: false, message: 'Price is required' });
        }

        if (!merchType) {
            return res.status(400).json({ success: false, message: 'Merch type is required' });
        }

        const productPrice = Number(price);

        if (!Number.isFinite(productPrice) || productPrice < 0) {
            return res.status(400).json({ success: false, message: 'Price must be a valid number' });
        }

        const coverFile = req.files?.cover?.[0];

        if (!coverFile) {
            return res.status(400).json({ success: false, message: 'Product image is required' });
        }

        const coverUpload = await uploadImageToCloudinary(coverFile.buffer);
        const slug = await createUniqueProductSlug(title);

        const product = await Product.create({
            artist: req.user.user_Id,
            type: 'merch',
            merchType,
            title,
            slug,
            description,
            price: productPrice,
            coverUrl: {
                public_id: coverUpload.public_id,
                url: coverUpload.secure_url,
            },
            nameYourPrice: false,
        });

        const createdProduct = await Product.findById(product._id).populate(productPopulate);

        return res.status(201).json({ success: true, data: formatProduct(createdProduct) });
    } catch (err) {
        next(err);
    }
};
