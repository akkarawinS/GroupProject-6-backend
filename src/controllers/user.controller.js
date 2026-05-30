import { User } from '../models/user.model.js';
import { Product } from '../models/product.model.js'

export const getUserProfile = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.user_Id)
            .populate('wishlist.product_id')
            .populate('collection.product_id')
            .populate('followingArtist','display_name profile_picture');


        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json(user);

    } catch (err) {
        next(err)
    }
}

export const updateUserProfile = async (req, res, next) => {
    const { display_name, profile_picture, bio } = req.body || {};
    const update = {};
    if (display_name !== undefined) update.display_name = display_name;
    if (profile_picture !== undefined) {
        if (typeof profile_picture === 'string') {
            update.profile_picture = { public_id: null, url: profile_picture };

        } else {
            update.profile_picture = profile_picture;
        }
    };
    if (bio !== undefined) update.bio = bio;

    try {
        const updateUserInfo = await User.findByIdAndUpdate(req.user.user_Id, update, { returnDocument: "after", runValidators: true, });

        return res.status(200).json({ success: true, data: updateUserInfo });


    } catch (err) {
        next(err);
    }

}