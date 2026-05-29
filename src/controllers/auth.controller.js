import { User } from '../models/user.model.js';
import { comparePassword } from '../middlewares/comparePassword.js'
import jwt from 'jsonwebtoken';


export const register = async (req, res, next) => {
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

export const login = async (req, res, next) => {
    try {
        const { email, password } = req.body

        if (!email || !password) {
            return res.status(400).send({ message: "Username or password are required" })
        };

        const findUser = await User.findOne({ email }).select('+password');
        const isMatch = await comparePassword(password, findUser.password);

        if (!findUser || !isMatch) {
            return res.status(400).send({ message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" })
        };

        const token = jwt.sign({ userId: findUser._id }, process.env.JWT_SECRET, {
            expiresIn: '1h',
        });

        const isProd = process.env.NODE_ENV === 'production'

        res.cookie("accessToken", token, {
            httpOnly: true,
            secure: isProd, // Only send over HTTPS in production
            sameSite: isProd ? "none" : "lax",
            path: "/",
            maxAge: 60 * 60 * 1000, // 1HR its age of cookie
        })


        res.status(200).json({
            success: true,
            message: 'เข้าสู่ระบบสำเร็จ!',
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