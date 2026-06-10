import mongoose from 'mongoose';
import { Product } from '../models/product.model.js'
import { Track } from '../models/track.model.js';
import { User } from '../models/user.model.js';
import { uploadAudioToCloudinary, uploadImageToCloudinary } from '../utils/cloudinaryUpload.js';
import { formatProduct, formatPublicProduct } from '../utils/productFormatter.js'
import { createUniqueProductSlug } from "../utils/productSlug.js";

export const productPopulate = [
    { path: 'artist', select: 'username display_name profile_picture banner_picture bio genre role' },
    { path: 'tracks' },
];

const MERCH_TYPES = ['tshirt', 'vinyl', 'cd', 'cassette', 'poster', 'snapback', 'tote', 'other'];
const MAX_STOCK_QUANTITY = 9999;

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const unslug = (value) => String(value || '').trim().replace(/[-_]+/g, ' ');

const toPositiveInt = (value, fallback, max) => {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed < 1) return fallback;
    return Math.min(parsed, max);
};

const toNumberFilter = (value) => {
    if (value === undefined || value === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
};

const parseJsonArray = (value, fieldName) => {
    if (!value) return [];
    try {
        const parsed = typeof value === 'string' ? JSON.parse(value) : value;
        if (!Array.isArray(parsed)) {
            const err = new Error(`${fieldName} must be an array`);
            err.status = 400;
            throw err;
        }
        return parsed;
    } catch (err) {
        if (err.status) throw err;
        const error = new Error(`${fieldName} must be valid JSON`);
        error.status = 400;
        throw error;
    }
};

const normalizeMerchVariants = (variants) => {
    return variants.map((variant, index) => {
        const stockValue = variant.stock ?? variant.stockQuantity ?? variant.stock_quantity;
        const stockQuantity = Number(stockValue);

        if (!Number.isInteger(stockQuantity) || stockQuantity < 0 || stockQuantity > MAX_STOCK_QUANTITY) {
            const err = new Error(`Variant ${index + 1} stock must be a whole number between 0 and ${MAX_STOCK_QUANTITY}`);
            err.status = 400;
            throw err;
        }

        return {
            variantId: variant.variantId || variant.variant_id || variant.sku || `variant-${index + 1}`,
            size: variant.size || '',
            color: variant.color || '',
            stockQuantity,
            sku: variant.sku || '',
        };
    });
};

const getTotalVariantStock = (variants = []) => (
    variants.reduce((sum, variant) => sum + (variant.stockQuantity || 0), 0)
);

const getSortOption = (sort) => {
    switch (sort) {
        case 'oldest':
            return { createdAt: 1 };
        case 'price_asc':
            return { price: 1, createdAt: -1 };
        case 'price_desc':
            return { price: -1, createdAt: -1 };
        case 'title_asc':
            return { title: 1 };
        case 'title_desc':
            return { title: -1 };
        case 'newest':
        default:
            return { createdAt: -1 };
    }
};

const buildProductQuery = async (queryParams) => {
    const { type, category, merchType, artist, genre, q, search, minPrice, maxPrice } = queryParams;
    const query = { deletedAt: null, status: 'published' };
    const selectedType = type || category;

    if (selectedType && selectedType !== 'all') {
        if (selectedType === 'digital') {
            query.type = { $in: ['single', 'album'] };
        } else if (MERCH_TYPES.includes(selectedType)) {
            query.type = 'merch';
            query.merchType = selectedType;
        } else if (['single', 'album', 'merch'].includes(selectedType)) {
            query.type = selectedType;
        }
    }

    if (merchType) {
        if (!MERCH_TYPES.includes(merchType)) {
            const err = new Error('Invalid merch type');
            err.status = 400;
            throw err;
        }
        query.type = 'merch';
        query.merchType = merchType;
    }

    const minPriceNumber = toNumberFilter(minPrice);
    const maxPriceNumber = toNumberFilter(maxPrice);
    if (minPriceNumber !== null || maxPriceNumber !== null) {
        query.price = {};
        if (minPriceNumber !== null) query.price.$gte = minPriceNumber;
        if (maxPriceNumber !== null) query.price.$lte = maxPriceNumber;
    }

    const artistFilters = [];
    const text = (q || search || '').trim();

    if (artist) {
        if (mongoose.Types.ObjectId.isValid(artist)) {
            artistFilters.push({ _id: artist });
        } else {
            const artistName = unslug(artist);
            artistFilters.push({
                $or: [
                    { username: new RegExp(`^${escapeRegex(artist)}$`, 'i') },
                    { display_name: new RegExp(`^${escapeRegex(artistName)}$`, 'i') },
                ],
            });
        }
    }

    if (genre) {
        const genreName = unslug(genre);
        artistFilters.push({
            $or: [
                { genre: new RegExp(`^${escapeRegex(genre)}$`, 'i') },
                { genre: new RegExp(`^${escapeRegex(genreName)}$`, 'i') },
            ],
        });
    }

    if (text) {
        const textRegex = new RegExp(escapeRegex(text), 'i');
        query.$or = [
            { title: textRegex },
            { description: textRegex },
            { merchType: textRegex },
        ];

        const matchingArtists = await User.find({
            role: 'artist',
            $or: [
                { username: textRegex },
                { display_name: textRegex },
                { genre: textRegex },
            ],
        }).select('_id');

        if (matchingArtists.length > 0) {
            query.$or.push({ artist: { $in: matchingArtists.map((item) => item._id) } });
        }
    }

    if (artistFilters.length > 0) {
        const artists = await User.find({ role: 'artist', $and: artistFilters }).select('_id');
        query.artist = { $in: artists.map((item) => item._id) };
    }

    return query;
};

//Get all prod info for shop (public info & preview url)
export const getAllProductInfo = async (req, res, next) => {
    try {
        const page = toPositiveInt(req.query.page, 1, 100000);
        const limit = toPositiveInt(req.query.limit, 50, 100);
        const skip = (page - 1) * limit;
        const query = await buildProductQuery(req.query);
        const sort = getSortOption(req.query.sort);

        const [product, total] = await Promise.all([
            Product.find(query)
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .populate(productPopulate),
            Product.countDocuments(query),
        ]);

        return res.status(200).json({
            success: true,
            data: product.map(formatPublicProduct),
            meta: {
                page,
                limit,
                total,
                total_pages: Math.ceil(total / limit),
                sort: req.query.sort || 'newest',
            },
        });
    }
    catch (err) {
        next(err);
    }
};

export const getProductById = async (req, res, next) => {
    try {
        const { productId } = req.params;
        const query = mongoose.Types.ObjectId.isValid(productId) ? { _id: productId } : { slug: productId };
        query.deletedAt = null;
        query.status = 'published';
        const product = await Product.findOne(query).populate(productPopulate);

        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }
        return res.status(200).json({ success: true, data: formatPublicProduct(product) });
    }
    catch (err) {
        next(err);
    }
};

export const getManageableProducts = async (req, res, next) => {
    try {
        const query = { deletedAt: null };
        if (req.user.role === 'artist') {
            query.artist = req.user.user_Id;
        }

        const products = await Product.find(query)
            .sort({ createdAt: -1 })
            .populate(productPopulate);

        return res.status(200).json({ success: true, data: products.map(formatProduct) });
    } catch (err) {
        next(err);
    }
};

export const getManageableProductById = async (req, res, next) => {
    try {
        const { productId } = req.params;
        const query = mongoose.Types.ObjectId.isValid(productId) ? { _id: productId } : { slug: productId };
        query.deletedAt = null;

        const product = await Product.findOne(query).populate(productPopulate);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        if (!canManageProduct(req.user, product)) {
            return res.status(403).json({ success: false, message: 'You can only manage your own products' });
        }

        return res.status(200).json({ success: true, data: formatProduct(product) });
    } catch (err) {
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
                { session, ordered: true },
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
                { session, ordered: true },
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

            const tracks = await Track.create(tracksData, { session, ordered: true });

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
                { session, ordered: true },
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
        const { title, description, price, merchType, stock, variants, weightGrams, shipsInternationally } = req.body || {};

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

        if (!MERCH_TYPES.includes(merchType)) {
            return res.status(400).json({ success: false, message: 'Invalid merch type' });
        }

        const productStock = stock === undefined || stock === ''
            ? null
            : Number(stock);

        if (productStock !== null && (!Number.isInteger(productStock) || productStock < 0 || productStock > MAX_STOCK_QUANTITY)) {
            return res.status(400).json({ success: false, message: `Stock must be a whole number between 0 and ${MAX_STOCK_QUANTITY}` });
        }

        const merchVariants = normalizeMerchVariants(parseJsonArray(variants, 'Variants'));
        const totalVariantStock = getTotalVariantStock(merchVariants);
        if (totalVariantStock > MAX_STOCK_QUANTITY) {
            return res.status(400).json({ success: false, message: `Total stock cannot exceed ${MAX_STOCK_QUANTITY}` });
        }
        const weight = weightGrams === undefined || weightGrams === ''
            ? null
            : Number(weightGrams);

        if (weight !== null && (!Number.isFinite(weight) || weight < 0)) {
            return res.status(400).json({ success: false, message: 'Weight must be a valid number' });
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
            merchVariants,
            weightGrams: weight,
            shipsInternationally: shipsInternationally === 'true' || shipsInternationally === true,
            title,
            slug,
            description,
            price: productPrice,
            stock: productStock,
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

const canManageProduct = (user, product) => {
    if (user.role === 'admin') return true;
    if (user.role !== 'artist') return false;
    const artistId = product.artist?._id || product.artist;
    return artistId?.toString() === user.user_Id?.toString();
};

const parseBooleanField = (value) => value === 'true' || value === true;

export const updateProduct = async (req, res, next) => {
    try {
        const { productId } = req.params;
        const query = mongoose.Types.ObjectId.isValid(productId) ? { _id: productId } : { slug: productId };
        query.deletedAt = null;

        const product = await Product.findOne(query);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        if (!canManageProduct(req.user, product)) {
            return res.status(403).json({ success: false, message: 'You can only manage your own products' });
        }

        const {
            title,
            description,
            price,
            status,
            nameYourPrice,
            merchType,
            stock,
            variants,
            weightGrams,
            shipsInternationally,
        } = req.body || {};

        if (title !== undefined) {
            if (!String(title).trim()) {
                return res.status(400).json({ success: false, message: 'Title is required' });
            }
            product.title = String(title).trim();
        }

        if (description !== undefined) {
            if (!String(description).trim()) {
                return res.status(400).json({ success: false, message: 'Description is required' });
            }
            product.description = String(description).trim();
        }

        if (price !== undefined && price !== '') {
            const productPrice = Number(price);
            if (!Number.isFinite(productPrice) || productPrice < 0) {
                return res.status(400).json({ success: false, message: 'Price must be a valid number' });
            }
            product.price = productPrice;
            if (product.nameYourPrice) product.minPrice = productPrice;
        }

        if (status !== undefined) {
            if (!['draft', 'published', 'archived'].includes(status)) {
                return res.status(400).json({ success: false, message: 'Invalid status' });
            }
            product.status = status;
        }

        if (nameYourPrice !== undefined && product.type !== 'merch') {
            const nextNameYourPrice = parseBooleanField(nameYourPrice);
            product.nameYourPrice = nextNameYourPrice;
            product.minPrice = nextNameYourPrice ? product.price : undefined;
        }

        if (product.type === 'merch') {
            if (merchType !== undefined) {
                if (!MERCH_TYPES.includes(merchType)) {
                    return res.status(400).json({ success: false, message: 'Invalid merch type' });
                }
                product.merchType = merchType;
            }

            if (stock !== undefined && stock !== '') {
                const productStock = Number(stock);
                if (!Number.isInteger(productStock) || productStock < 0 || productStock > MAX_STOCK_QUANTITY) {
                    return res.status(400).json({ success: false, message: `Stock must be a whole number between 0 and ${MAX_STOCK_QUANTITY}` });
                }
                product.stock = productStock;
            }

            if (variants !== undefined) {
                product.merchVariants = normalizeMerchVariants(parseJsonArray(variants, 'Variants'));
                const totalVariantStock = getTotalVariantStock(product.merchVariants);
                if (totalVariantStock > MAX_STOCK_QUANTITY) {
                    return res.status(400).json({ success: false, message: `Total stock cannot exceed ${MAX_STOCK_QUANTITY}` });
                }
                product.stock = totalVariantStock;
            }

            if (weightGrams !== undefined) {
                const weight = weightGrams === '' ? null : Number(weightGrams);
                if (weight !== null && (!Number.isFinite(weight) || weight < 0)) {
                    return res.status(400).json({ success: false, message: 'Weight must be a valid number' });
                }
                product.weightGrams = weight;
            }

            if (shipsInternationally !== undefined) {
                product.shipsInternationally = parseBooleanField(shipsInternationally);
            }
        }

        const coverFile = req.files?.cover?.[0];
        if (coverFile) {
            const coverUpload = await uploadImageToCloudinary(coverFile.buffer);
            product.coverUrl = {
                public_id: coverUpload.public_id,
                url: coverUpload.secure_url,
            };
        }

        await product.save();

        const updatedProduct = await Product.findById(product._id).populate(productPopulate);
        return res.status(200).json({ success: true, data: formatProduct(updatedProduct) });
    } catch (err) {
        next(err);
    }
};

export const deleteProduct = async (req, res, next) => {
    try {
        const { productId } = req.params;
        const query = mongoose.Types.ObjectId.isValid(productId) ? { _id: productId } : { slug: productId };
        query.deletedAt = null;

        const product = await Product.findOne(query);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        if (!canManageProduct(req.user, product)) {
            return res.status(403).json({ success: false, message: 'You can only manage your own products' });
        }

        product.deletedAt = new Date();
        product.status = 'archived';
        await product.save();

        return res.status(200).json({ success: true, message: 'Product deleted' });
    } catch (err) {
        next(err);
    }
};
