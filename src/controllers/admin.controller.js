import { User } from '../models/user.model.js';

export const getAllUsers = async (req, res, next) => {
    try {
        const users = await User.find();
        return res.status(200).json({ success: true, data: users });
    } catch (err) {
        next(err);
    }
}
