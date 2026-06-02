import { Product } from '../models/product.model.js'
import { Track } from '../models/track.model.js';
import { uploadAudioToCloudinary, uploadImageToCloudinary } from '../utils/cloudinaryUpload.js';

export const getAllProductInfo = async (req, res, next) => {
    try {
        const product = await Product.find().populate('tracks');

        return res.status(200).json({ success: true, data: product });
    }
    catch (err) {
        next(err);
    }
};

export const getProductById = async (req, res, next) => {
    try {
        const product = await Product.findById(req.params.productId).populate('tracks');

        if (!product) {
            return res.status(404).json({ success: false, error: 'Product not found' });
        }
        return res.status(200).json({ success: true, data: product });
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

        const productData = {
            artist: req.user.user_Id,
            type, title, slug: title,
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

        return res.status(201).json({ success: true, data: product });

    } catch (err) {
        next(err)
    }
}
