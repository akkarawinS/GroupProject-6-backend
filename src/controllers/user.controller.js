import { User } from '../models/user.model.js';
import { Product } from '../models/product.model.js';
import { comparePassword } from '../utils/comparePassword.js';
import { productPopulate } from './product.controller.js';
import { formatArtist, formatOwnedProduct, formatPublicProduct } from '../utils/productFormatter.js';
import { uploadImageToCloudinary } from '../utils/cloudinaryUpload.js';

import mongoose from 'mongoose';

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const slugifyText = (value) => {
    return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
};

const toPositiveInt = (value, fallback, max) => {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed < 1) return fallback;
    return Math.min(parsed, max);
};

const buildArtistQuery = (queryParams = {}) => {
    const { q, search, genre } = queryParams;
    const query = { role: 'artist' };
    const text = (q || search || '').trim();

    if (genre) {
        const genreText = String(genre).trim().replace(/[-_]+/g, ' ');
        query.genre = {
            $in: [
                new RegExp(`^${escapeRegex(genre)}$`, 'i'),
                new RegExp(`^${escapeRegex(genreText)}$`, 'i'),
            ],
        };
    }

    if (text) {
        const textRegex = new RegExp(escapeRegex(text), 'i');
        query.$or = [
            { username: textRegex },
            { display_name: textRegex },
            { bio: textRegex },
            { genre: textRegex },
        ];
    }

    return query;
};

const findArtistByIdOrSlug = async (artistId) => {
    if (mongoose.Types.ObjectId.isValid(artistId)) {
        return User.findOne({ _id: artistId, role: 'artist' });
    }

    const slug = slugifyText(artistId);
    const candidates = await User.find({
        role: 'artist',
        $or: [
            { username: new RegExp(`^${escapeRegex(artistId)}$`, 'i') },
            { username: new RegExp(`^${escapeRegex(slug)}$`, 'i') },
            { display_name: new RegExp(`^${escapeRegex(String(artistId).replace(/[-_]+/g, ' '))}$`, 'i') },
        ],
    });

    return candidates.find((artist) => slugifyText(artist.username) === slug || slugifyText(artist.display_name) === slug) ?? null;
};



export const getPublicArtists = async (req, res, next) => {
    try {
        const page = toPositiveInt(req.query.page, 1, 100000);
        const limit = toPositiveInt(req.query.limit, 50, 100);
        const skip = (page - 1) * limit;
        const query = buildArtistQuery(req.query);

        const [artists, total] = await Promise.all([
            User.find(query)
                .select('username display_name profile_picture banner_picture bio genre role createdAt')
                .sort({ display_name: 1, username: 1 })
                .skip(skip)
                .limit(limit),
            User.countDocuments(query),
        ]);

        const productCounts = await Product.aggregate([
            {
                $match: {
                    artist: { $in: artists.map((artist) => artist._id) },
                    status: 'published',
                    deletedAt: null,
                },
            },
            { $group: { _id: '$artist', count: { $sum: 1 } } },
        ]);
        const productCountByArtist = new Map(productCounts.map((item) => [item._id.toString(), item.count]));

        return res.status(200).json({
            success: true,
            data: artists.map((artist) => ({
                ...formatArtist(artist),
                product_count: productCountByArtist.get(artist._id.toString()) ?? 0,
            })),
            meta: {
                page,
                limit,
                total,
                total_pages: Math.ceil(total / limit),
            },
        });
    } catch (err) {
        next(err);
    }
};

export const getPublicArtistById = async (req, res, next) => {
    try {
        const { artistId } = req.params;
        const artist = await findArtistByIdOrSlug(artistId);

        if (!artist) {
            return res.status(404).json({ success: false, message: 'Artist not found' });
        }

        const products = await Product.find({
            artist: artist._id,
            status: 'published',
            deletedAt: null,
        })
            .sort({ createdAt: -1 })
            .populate(productPopulate);

        return res.status(200).json({
            success: true,
            data: {
                ...formatArtist(artist),
                product_count: products.length,
                products: products.map(formatPublicProduct),
            },
        });
    } catch (err) {
        next(err);
    }
};


export const getUserProfile = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.user_Id)
            .populate({ path: 'wishlist.product_id', populate: productPopulate })
            .populate({ path: 'collection.product_id', populate: productPopulate })
            .populate('followingArtist', 'username display_name profile_picture banner_picture bio genre role');


        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json(user);

    } catch (err) {
        next(err)
    }
}

export const updateUserProfile = async (req, res, next) => {
    try {
        const { display_name, profile_picture, banner_picture, bio } = req.body || {};
        const update = {};
        const profileFile = req.files?.profile_picture?.[0];
        const bannerFile = req.files?.banner_picture?.[0];

        if (display_name !== undefined) update.display_name = display_name;
        if (bio !== undefined) update.bio = bio;

        if (profileFile) {
            const upload = await uploadImageToCloudinary(profileFile.buffer);
            update.profile_picture = {
                public_id: upload.public_id,
                url: upload.secure_url,
            };
        } else if (profile_picture !== undefined) {
            if (typeof profile_picture === 'string') {
                update.profile_picture = { public_id: null, url: profile_picture };

            } else {
                update.profile_picture = profile_picture;
            }
        };

        if (bannerFile) {
            const upload = await uploadImageToCloudinary(bannerFile.buffer);
            update.banner_picture = {
                public_id: upload.public_id,
                url: upload.secure_url,
            };
        } else if (banner_picture !== undefined) {
            if (typeof banner_picture === 'string') {
                update.banner_picture = { public_id: null, url: banner_picture };
            } else {
                update.banner_picture = banner_picture;
            }
        };

        const updateUserInfo = await User.findByIdAndUpdate(req.user.user_Id, update, { returnDocument: "after", runValidators: true, });

        return res.status(200).json({ success: true, data: updateUserInfo });


    } catch (err) {
        next(err);
    }

}

export const getMyCollection = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.user_Id).populate({ path: 'collection.product_id', populate: productPopulate, });

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found', });
        }
        const products = user.collection.map((item) => {
            if (!item.product_id) return null;

            const product = item.product_id.toObject ? item.product_id.toObject() : item.product_id;

            product.purchasedAt = item.purchasedAt;

            return formatOwnedProduct(product);
        }).filter(Boolean);

        return res.status(200).json({ success: true, data: products, });

    } catch (err) {
        next(err)
    }
};

export const changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, message: 'All field are required!' });
        }
        const user = await User.findById(req.user.user_Id).select('+password');
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        const isMatch = await comparePassword(currentPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Incorrect  password" })
        }

        user.password = newPassword;
        await user.save();

        return res.status(200).json({ message: 'Password updated successfully.' });
    } catch (err) {
        next(err)
    }
}

export const toggleFollowArtist = async (req, res, next) => {

    try {
        const { artistId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(artistId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid artist id"
            });
        }

        const userId = req.user.user_Id

        if (userId === artistId) {
            return res.status(400).json({ success: false, message: "You cannot follow yourself" });
        }

        const user = await User.findById(userId)

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const artist = await User.findOne({ _id: artistId, role: 'artist' });

        if (!artist) {
            return res.status(404).json({ success: false, message: 'Artist not found' })
        };

        const isFollowed = user.followingArtist.some(id => id.toString() === artistId);

        if (isFollowed) {
            await User.findByIdAndUpdate(userId, { $pull: { followingArtist: artistId } });
            return res.json({ success: true, followed: false });
        }

        await User.findByIdAndUpdate(userId, { $addToSet: { followingArtist: artistId } });

        return res.json({ success: true, followed: true });

    } catch (err) {
        next(err)
    }


}

export const toggleWishlist = async (req, res, next) => {
    try {
        const { productId } = req.params;
        const userId = req.user.user_Id;


        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid product id"
            });
        }

        const user = await User.findById(userId);


        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        const product = await Product.findById(productId);

        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        const isWishlisted = user.wishlist.some(i => i.product_id.toString() === productId);

        if (isWishlisted) {
            await User.findByIdAndUpdate(userId, { $pull: { wishlist: { product_id: productId } } });
            return res.json({ success: true, wishlisted: false });
        }

        await User.findByIdAndUpdate(userId, { $addToSet: { wishlist: { product_id: productId } } });
        return res.json({ success: true, wishlisted: true });
    } catch (err) {
        next(err);
    }
}
