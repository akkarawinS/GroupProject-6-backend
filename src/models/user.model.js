import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const userSchema = new mongoose.Schema(
    {
        username: { type: String, required: true, trim: true, unique: true, index: true },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email format"],
            index: true
        },
        password: { type: String, required: true, minlength: 8, select: false },
        role: { type: String, enum: ["user", "admin", "artist"], default: "user" },
        genre: { type: String, default: null },
        first_name: { type: String, trim: true, lowercase: true},
        last_name: { type: String, trim: true, lowercase: true },
        display_name: { type: String, trim: true },
        profile_picture: { public_id: { type: String, default: null }, url: { type: String, default: null } },
        banner_picture: { public_id: { type: String, default: null }, url: { type: String, default: null } },
        bio: { type: String, maxlength: [250, "Bio must be less than 250 characters"], default: "" },
        collection: [{
            product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Products', required: true },
            purchasedAt: { type: Date, default: Date.now }
        }],
        followingArtist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        wishlist: [{
            product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Products', required: true }
        }]
    }, { timestamps: true },
);

userSchema.pre('save', async function () {
    if (!this.isModified('password')) return;

    this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.toJSON = function () {
    const user = this.toObject();

    delete user.password;
    delete user.__v;

    return user;
};

userSchema.pre('validate', function () {
    if (!this.display_name) {
        this.display_name = this.username;
    }
});


export const User = mongoose.model("User", userSchema);
