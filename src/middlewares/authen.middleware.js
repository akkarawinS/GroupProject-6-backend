import jwt from "jsonwebtoken";
export const authUser = async (req, res, next) => {
    const token = req.cookies.accessToken;
    if (!token) {
        return res.status(401).json({success: false,error: "Access denied. No token!"});
    }
    try {
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decodedToken;
        next();
    } catch (error) {
        next(error);
    }
};