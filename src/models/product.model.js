import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
    {
        artist: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true, },
        type: { type: String, enum: ['single', 'album', 'merch'], required: true },
        merchType: { type: String, enum: ['tshirt', 'vinyl', 'cd', 'cassette', 'poster', 'snapback', 'tote'], default: null },
        title: { type: String, trim: true, required: true },
        slug: { type: String, unique: true, lowercase: true, trim: true, index: true, required: true },
        tracks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Track' }],
        description: { type: String, required: true },
        price: { type: Number, required: true, min: 0 },
        minPrice: { type: Number, min: 0 },
        stock: { type: Number, default: null, min: 0 ,validate: {validator(value){
            if(this.type === 'merch') return value === null || value === undefined || Number.isInteger(value) && value >= 0;
            return value === null || value === undefined;
        }, message: 'Stock is only required for merch products'}},
        coverUrl: { public_id: { type: String, default: null }, url: { type: String, default: null } },
        nameYourPrice: { type: Boolean, default: false },
        status: { type: String, enum: ['draft', 'published', 'archived'], default: 'published' },
        releaseDate: { type: Date, default: Date.now },
        deletedAt: { type: Date, default: null }
    }, { timestamps: true },
)

export const Product = mongoose.model('Products', productSchema);
