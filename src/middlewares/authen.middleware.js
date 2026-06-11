import jwt from "jsonwebtoken";

export const authUser = async (req, res, next) => {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
        return res.status(401).json({ success: false, code: "NO_TOKEN", message: "Access denied. No token!" });
    }

    try {
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decodedToken;
        next();
    } catch (error) {
        if (error.name === "TokenExpiredError" || error.name === "JsonWebTokenError") {
            return res.status(401).json({ success: false, code: "TOKEN_EXPIRED", message: "Session expired. Please log in again." });
        }
        next(error);
    }
};
