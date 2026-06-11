import jwt from 'jsonwebtoken';
export const ACCESS_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;

export const signAccessToken = (payload) => {
    return jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    });
};
