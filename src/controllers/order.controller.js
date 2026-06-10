import mongoose from 'mongoose';
import { Cart } from '../models/cart.model.js';
import { Order } from '../models/order.model.js';
import { Product } from '../models/product.model.js';

const getArtistSnapshotName = (artist) => {
    if (!artist) return 'Unknown artist';
    return artist.display_name || artist.username || 'Unknown artist';
};

const getCoverSnapshotUrl = (coverUrl) => {
    if (!coverUrl) return null;
    if (typeof coverUrl === 'string') return coverUrl;
    return coverUrl.url || null;
};

const getDownloadTracksSnapshot = (product) => {
    if (!['single', 'album'].includes(product.type)) return [];

    return (product.tracks || [])
        .map((track, index) => {
            const audioUrl = track?.audioUrl?.url;
            if (!audioUrl) return null;

            return {
                track_id: track._id || null,
                title: track.title || `${product.title} ${index + 1}`,
                audio_file_url: audioUrl,
            };
        })
        .filter(Boolean);
};

const isTransactionUnsupportedError = (err) => {
    return err?.code === 20
        || err?.codeName === 'IllegalOperation'
        || String(err?.message || '').includes('Transaction numbers are only allowed');
};

const buildOrderFromCart = async ({ userId, paymentMethod, shippingAddress, session = null }) => {
    const cartQuery = Cart.findOne({ user_id: userId, status: 'active' })
        .populate({
            path: 'items.product_id',
            populate: [
                { path: 'artist', select: 'username display_name' },
                { path: 'tracks' },
            ],
        });

    if (session) cartQuery.session(session);

    const cart = await cartQuery;

    if (!cart || cart.items.length === 0) {
        const err = new Error('Cart is empty');
        err.status = 400;
        throw err;
    }

    const orderItems = [];
    let subtotal = 0;

    for (const cartItem of cart.items) {
        const product = cartItem.product_id;

        if (!product || product.deletedAt || product.status !== 'published') {
            const err = new Error('Product not found');
            err.status = 404;
            throw err;
        }

        let quantity = cartItem.quantity;
        if (product.type === 'single' || product.type === 'album') {
            quantity = 1;
        }

        if (product.type === 'merch') {
            const variant = product.merchVariants.find((item) => item.variantId === cartItem.variant_id);

            if (!variant) {
                const err = new Error('Variant not found');
                err.status = 404;
                throw err;
            }

            if (variant.stockQuantity < quantity) {
                const err = new Error('Not enough stock');
                err.status = 400;
                throw err;
            }

            variant.stockQuantity -= quantity;
            if (Number.isInteger(product.stock)) {
                product.stock = Math.max(product.stock - quantity, 0);
            }

            await product.save({ session });
        }

        const unitPrice = product.price;
        const itemSubtotal = unitPrice * quantity;
        subtotal += itemSubtotal;

        orderItems.push({
            product_id: product._id,
            artist_id: product.artist?._id || product.artist,
            title_snapshot: product.title,
            artist_name_snapshot: getArtistSnapshotName(product.artist),
            cover_url_snapshot: getCoverSnapshotUrl(product.coverUrl),
            product_type: product.type,
            variant_id: cartItem.variant_id,
            quantity,
            unit_price: unitPrice,
            subtotal: itemSubtotal,
            download_tracks: getDownloadTracksSnapshot(product),
        });
    }

    const shippingFee = 0;
    const discountAmount = 0;
    const total = subtotal + shippingFee - discountAmount;

    const [order] = await Order.create([{
        user_id: userId,
        items: orderItems,
        shipping_address: shippingAddress || null,
        payment_method: paymentMethod,
        payment_status: 'paid',
        order_status: 'processing',
        subtotal,
        shipping_fee: shippingFee,
        discount_amount: discountAmount,
        total,
    }], { session });

    cart.status = 'checked_out';
    await cart.save({ session });

    return order;
};

export const createOrder = async (req, res, next) => {
    const userId = req.user.user_Id;
    const { payment_method, shipping_address } = req.body || {};

    if (!payment_method) {
        return res.status(400).json({ success: false, message: 'payment_method is required' });
    }

    const session = await mongoose.startSession();

    try {
        let order;

        try {
            await session.withTransaction(async () => {
                order = await buildOrderFromCart({
                    userId,
                    paymentMethod: payment_method,
                    shippingAddress: shipping_address,
                    session,
                });
            });
        } catch (err) {
            if (!isTransactionUnsupportedError(err)) throw err;

            order = await buildOrderFromCart({
                userId,
                paymentMethod: payment_method,
                shippingAddress: shipping_address,
            });
        }

        return res.status(201).json({ success: true, data: order });
    } catch (err) {
        next(err);
    } finally {
        await session.endSession();
    }
};

export const getOrders = async (req, res, next) => {
    try {
        const userId = req.user.user_Id;
        let query = { user_id: userId };

        if (req.user.role === 'admin') {
            query = {};
        } else if (req.user.role === 'artist') {
            query = { 'items.artist_id': userId };
        }

        const orders = await Order.find(query)
            .sort({ createdAt: -1 })
            .populate('user_id', 'username email display_name')
            .populate('items.product_id');

        return res.status(200).json({ success: true, data: orders });
    } catch (err) {
        next(err);
    }
};

export const getOrderById = async (req, res, next) => {
    try {
        const userId = req.user.user_Id;
        const { orderId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            return res.status(400).json({ success: false, message: 'Invalid orderId' });
        }

        const query = { _id: orderId };
        if (req.user.role !== 'admin') query.user_id = userId;

        const order = await Order.findOne(query)
            .populate('user_id', 'username email display_name')
            .populate('items.product_id');

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        return res.status(200).json({ success: true, data: order });
    } catch (err) {
        next(err);
    }
};
