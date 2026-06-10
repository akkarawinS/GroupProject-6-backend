import mongoose from 'mongoose';
import { Cart } from '../models/cart.model.js';
import { Product } from '../models/product.model.js';

const calculateSubtotal = (items = []) => {
    return items.reduce((sum, item) => sum + item.price_at_added * item.quantity, 0);
};

const formatCart = (cart) => {
    const cartObject = cart?.toObject ? cart.toObject() : cart;

    return {
        ...cartObject,
        subtotal: calculateSubtotal(cartObject?.items || []),
    };
};

export const getCartItem = async (req, res, next) => {
    try {
        const userId = req.user.user_Id;

        const cart = await Cart.findOne({ user_id: userId, status: 'active' })
            .populate('items.product_id');

        if (!cart) {
            return res.status(200).json({
                success: true,
                data: {
                    user_id: userId,
                    items: [],
                    status: 'active',
                    subtotal: 0,
                },
            });
        }

        return res.status(200).json({ success: true, data: formatCart(cart) });
    } catch (err) {
        next(err);
    }
};

//Add item to cart
export const postCartItem = async (req, res, next) => {
    try {
        const userId = req.user.user_Id;
        const { product_id, variant_id } = req.body || {};
        let { quantity = 1 } = req.body || {};

        if (!mongoose.Types.ObjectId.isValid(product_id)) {
            return res.status(400).json({ success: false, message: 'Invalid product_id' });
        }

        quantity = Number(quantity);
        if (!Number.isInteger(quantity) || quantity < 1) {
            return res.status(400).json({ success: false, message: 'Quantity must be a positive integer' });
        }

        const product = await Product.findOne({
            _id: product_id,
            status: 'published',
            deletedAt: null,
        });

        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        if (product.type === 'single' || product.type === 'album') {
            quantity = 1;
        }

        let normalizedVariantId = null;
        if (product.type === 'merch') {
            if (!variant_id) {
                return res.status(400).json({ success: false, message: 'variant_id is required for merch' });
            }

            normalizedVariantId = String(variant_id);
            const variant = product.merchVariants.find((item) => item.variantId === normalizedVariantId);

            if (!variant) {
                return res.status(404).json({ success: false, message: 'Variant not found' });
            }

            if (variant.stockQuantity < quantity) {
                return res.status(400).json({ success: false, message: 'Not enough stock' });
            }
        }

        let cart = await Cart.findOne({ user_id: userId, status: 'active' });
        if (!cart) {
            cart = await Cart.create({ user_id: userId, items: [], status: 'active' });
        }

        const existingItem = cart.items.find((item) => (
            item.product_id.toString() === product._id.toString()
            && (item.variant_id || null) === normalizedVariantId
        ));

        if (existingItem) {
            const nextQuantity = product.type === 'merch'
                ? existingItem.quantity + quantity
                : 1;

            if (product.type === 'merch') {
                const variant = product.merchVariants.find((item) => item.variantId === normalizedVariantId);
                if (variant.stockQuantity < nextQuantity) {
                    return res.status(400).json({ success: false, message: 'Not enough stock' });
                }
            }

            existingItem.quantity = nextQuantity;
        } else {
            cart.items.push({
                product_id: product._id,
                product_type: product.type,
                variant_id: normalizedVariantId,
                quantity,
                price_at_added: product.price,
            });
        }

        await cart.save();
        await cart.populate('items.product_id');

        return res.status(201).json({ success: true, data: formatCart(cart) });
    } catch (err) {
        next(err);
    }
};

export const patchCartItem = async (req, res, next) => {
    try {
        const userId = req.user.user_Id;
        const { itemId } = req.params;
        let { quantity } = req.body || {};

        quantity = Number(quantity);
        if (!Number.isInteger(quantity) || quantity < 1) {
            return res.status(400).json({ success: false, message: 'Quantity must be a positive integer' });
        }

        const cart = await Cart.findOne({ user_id: userId, status: 'active' });
        if (!cart) {
            return res.status(404).json({ success: false, message: 'Cart not found' });
        }

        const item = cart.items.id(itemId);
        if (!item) {
            return res.status(404).json({ success: false, message: 'Cart item not found' });
        }

        const product = await Product.findOne({
            _id: item.product_id,
            status: 'published',
            deletedAt: null,
        });

        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        if (product.type === 'single' || product.type === 'album') {
            quantity = 1;
        }

        if (product.type === 'merch') {
            const variant = product.merchVariants.find((variantItem) => variantItem.variantId === item.variant_id);

            if (!variant) {
                return res.status(404).json({ success: false, message: 'Variant not found' });
            }

            if (variant.stockQuantity < quantity) {
                return res.status(400).json({ success: false, message: 'Not enough stock' });
            }
        }

        item.quantity = quantity;

        await cart.save();
        await cart.populate('items.product_id');

        return res.status(200).json({ success: true, data: formatCart(cart) });
    } catch (err) {
        next(err);
    }
};

export const deleteCartItem = async (req, res, next) => {
    try {
        const userId = req.user.user_Id;
        const { itemId } = req.params;

        const cart = await Cart.findOne({ user_id: userId, status: 'active' });
        if (!cart) {
            return res.status(404).json({ success: false, message: 'Cart not found' });
        }

        const item = cart.items.id(itemId);
        if (!item) {
            return res.status(404).json({ success: false, message: 'Cart item not found' });
        }

        cart.items.pull(itemId);

        await cart.save();
        await cart.populate('items.product_id');

        return res.status(200).json({ success: true, data: formatCart(cart) });
    } catch (err) {
        next(err);
    }
};

export const deleteCart = async (req, res, next) => {
    try {
        const userId = req.user.user_Id;

        const cart = await Cart.findOne({ user_id: userId, status: 'active' });
        if (!cart) {
            return res.status(200).json({
                success: true,
                data: {
                    user_id: userId,
                    items: [],
                    status: 'active',
                    subtotal: 0,
                },
            });
        }

        cart.items = [];

        await cart.save();

        return res.status(200).json({ success: true, data: formatCart(cart) });
    } catch (err) {
        next(err);
    }
};
