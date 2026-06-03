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
            return res.status(404).json({ success: false, error: 'Product not found' });
        }
        return res.status(200).json({ success: true, data: formatProduct(product) });
    }
    catch (err) {
        next(err);
    }
};

export const createProduct = async (req, res, next) => {
    try {
        const { type, title, description, price, minPrice, stock, nameYourPrice, releaseDate } = req.body || {};

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

        const durationSec = Math.ceil(audioUpload.duration);

        const track = await Track.create({ artist: req.user.user_Id, title, durationSec, audioUrl: { public_id: audioUpload.public_id, url: audioUpload.secure_url, } });

        const slug = await createUniqueProductSlug(title);

        const productData = {
            artist: req.user.user_Id,
            type, title, slug,
            description,
            price,
            minPrice,
            coverUrl: {
                public_id: coverUpload.public_id,
                url: coverUpload.secure_url,
            },
            nameYourPrice,
            releaseDate,
            tracks: [track._id]
        }

        if (type === 'merch') {
            productData.stock = stock;
        }

        const product = await Product.create(productData);

        const createdProduct = await Product.findById(product._id).populate(productPopulate);

        return res.status(201).json({ success: true, data: formatProduct(createdProduct) });

    } catch (err) {
        next(err)
    }
}
