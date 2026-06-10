import jwt from "jsonwebtoken";
import { ACCESS_TOKEN_REFRESH_THRESHOLD_SECONDS, setAccessTokenCookie } from "../utils/token.js";

export const authUser = async (req, res, next) => {
    const token = req.cookies?.accessToken;
    if (!token) {
        return res.status(401).json({ success: false, code: "NO_TOKEN", message: "Access denied. No token!" });
    }

    try {
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decodedToken;

        // Sliding session: while the user stays active, push the expiry forward
        // so a long-lived session never silently dies mid-use.
        const remainingSeconds = decodedToken.exp - Math.floor(Date.now() / 1000);
        if (remainingSeconds < ACCESS_TOKEN_REFRESH_THRESHOLD_SECONDS) {
            setAccessTokenCookie(res, { user_Id: decodedToken.user_Id, role: decodedToken.role });
        }

        next();
    } catch (error) {
        if (error.name === "TokenExpiredError" || error.name === "JsonWebTokenError") {
            return res.status(401).json({ success: false, code: "TOKEN_EXPIRED", message: "Session expired. Please log in again." });
        }
        next(error);
    }
};
