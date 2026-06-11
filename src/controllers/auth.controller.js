import { User } from '../models/user.model.js';
import { comparePassword } from '../utils/comparePassword.js'
import { signAccessToken } from '../utils/token.js';


export const fanRegister = async (req, res, next) => {
    try {
        const { username, email, first_name, last_name, password } = req.body || {};

        if (!username || !email || !first_name || !last_name || !password) {
            return res.status(400).json({ success: false, message: 'All fields are required' })
        };
        // Check dupe email

        const existUser = await User.findOne({ $or: [{ email }, { username }] });

        if (existUser?.email === email) {
            return res.status(400).json({ success: false, message: 'this email already exist' })
        };
        if (existUser?.username === username) {
            return res.status(400).json({ success: false, message: 'this username already exist' })
        };

        const newUser = await User.create({ username, email, first_name, last_name, password, display_name: username,role: 'user' })
        res.status(201).json({ success: true, data: newUser })

    } catch (error) {
        next(error)

    }
};

export const artistRegister = async (req, res, next) => {
    try {
        const { display_name, username, email, genre, password } = req.body || {};

        if (!username || !email || !display_name || !genre || !password) {
            return res.status(400).json({ success: false, message: 'All fields are required' })
        };
        // Check duplicate email or username
        const existUser = await User.findOne({ $or: [{ email }, { username }] });

        if (existUser?.email === email) {
            return res.status(400).json({ success: false, message: 'this email already exist' })
        };
        if (existUser?.username === username) {
            return res.status(400).json({ success: false, message: 'this username already exist' })
        };


        const artistUser = await User.create({ username, email, genre, password, display_name, role: 'artist' })
        res.status(201).json({ success: true, data: artistUser })

    } catch (error) {
        next(error)

    }
};

export const login = async (req, res, next) => {
    try {
        const { email, password } = req.body

        if (!email || !password) {
            return res.status(401).send({ message: "Username or password are required" })
        };

        const findUser = await User.findOne({ email }).select('+password');

        // Check if email of this user is not correct
        if (!findUser) {
            return res.status(401).send({ success: false, message: "Invalid email or password" })
        };
        // Check password 
        const isMatch = await comparePassword(password, findUser.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Invalid email or password" })
        }

        const token = signAccessToken({ user_Id: findUser._id, role: findUser.role });

        res.status(200).json({
            success: true,
            message: 'Logged in successfully',
            token,
            user: {
                _id: findUser._id,
                username: findUser.username,
                email: findUser.email,
                role: findUser.role,

            },
        });


    } catch (err) {
        next(err)
    }
}

export const logout = async (req, res, next) => {
    return res.status(200).json({
        success: true,
        message: 'Logged out successfully',
    });
};

export const checkUserState = async (req, res, next) => {
    try {
        const userId = req.user.user_Id;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "User not found !",
            });
        }
        return res.status(200).json({
            success: true,
            data: {
                _id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
            },
        });

    } catch (err) {
        next(err);
    }
};
