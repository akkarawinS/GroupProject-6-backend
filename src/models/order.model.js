import mongoose from 'mongoose';

const MAX_ORDER_ITEM_QUANTITY = 9999;

const orderItemSchema = new mongoose.Schema({
    product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Products', required: true },
    artist_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title_snapshot: { type: String, required: true },
    artist_name_snapshot: { type: String, required: true },
    cover_url_snapshot: { type: String, default: null },
    product_type: { type: String, enum: ['single', 'album', 'merch'], required: true },
    variant_id: { type: String, default: null },
    quantity: { type: Number, required: true, min: 1, max: MAX_ORDER_ITEM_QUANTITY, validate: Number.isInteger },
    unit_price: { type: Number, required: true, min: 0 },
    subtotal: { type: Number, required: true, min: 0 },
    download_tracks: [{
        track_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Track', default: null },
        title: { type: String, required: true },
        audio_file_url: { type: String, required: true },
    }],
}, { _id: false });

const shippingAddressSchema = new mongoose.Schema({
    full_name: { type: String, trim: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    address_line1: { type: String, trim: true, default: '' },
    address_line2: { type: String, trim: true, default: '' },
    city: { type: String, trim: true, default: '' },
    state: { type: String, trim: true, default: '' },
    postal_code: { type: String, trim: true, default: '' },
    country: { type: String, trim: true, default: '' },
}, { _id: false });

const orderSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true },
    items: { type: [orderItemSchema], required: true },
    shipping_address: { type: shippingAddressSchema, default: null },
    payment_method: { type: String, trim: true, required: true },
    payment_status: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
    order_status: {
        type: String,
        enum: ['pending', 'processing', 'shipped', 'completed', 'cancelled'],
        default: 'pending',
    },
    subtotal: { type: Number, required: true, min: 0 },
    shipping_fee: { type: Number, default: 0, min: 0 },
    discount_amount: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
}, { timestamps: true });

export const Order = mongoose.model('Order', orderSchema);
