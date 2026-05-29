import { User } from '../models/user.model.js';


export const register = async (req, res) => {
    try {
        const { username, email, password } = req.body || {};
        const existUser = await User.findOne({ email });


        if (!username || !email || !password) {
            return res.status(400).json({ success: false, message: 'All fields are require' })
        };
        // Check dupe email
        if (existUser) {
            return res.status(400).json({ success: false, message: 'this email already exist' })
        };

        const newUser = await User.create({ username, email, password })
        res.status(201).json({ success: true, data: newUser })

    } catch (error) {
        next(error)

    }
};