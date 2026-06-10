import mongoose from 'mongoose';

const MAX_CART_QUANTITY = 9999;

const cartItemSchema = new mongoose.Schema({
    product_id: { type: mongoose.Schema.Types.ObjectId, ref: "Products", required: true },
    product_type: { type: String, enum: ["single", "album", "merch"], required: true },
    variant_id: {
        type: String, default: null, validate: {
            validator(value) {
                if (this.product_type === 'merch') return Boolean(value);
                return value === null || value === undefined || value === '';
            }, message: 'variant_id is required for merch only'
        }
    },
    quantity: { type: Number, min: 1, max: MAX_CART_QUANTITY, default: 1 , validate:Number.isInteger},
    price_at_added: { type: Number, required: true, min: 0 }
}, { timestamps: true }
);

const cartSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true, },
    items: { type: [cartItemSchema], default: [] },
    status: { type: String, enum: ["active", "checked_out", "abandoned"], default: "active" },
}, { timestamps: true }
);


cartSchema.index(
    { user_id : 1, status: 1},
    { unique: true, partialFilterExpression: { status: 'active'}}
);


export const Cart = mongoose.model('Cart', cartSchema);
