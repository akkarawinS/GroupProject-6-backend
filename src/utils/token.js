import jwt from 'jsonwebtoken';

// Access token lifetime: 7 days, refreshed (slid forward) whenever the
// remaining lifetime drops below the threshold and the user makes a request.
export const ACCESS_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;
export const ACCESS_TOKEN_REFRESH_THRESHOLD_SECONDS = 24 * 60 * 60;

export const signAccessToken = (payload) => {
    return jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    });
};

export const accessTokenCookieOptions = () => {
    const isProd = process.env.NODE_ENV === 'production';

    return {
        httpOnly: true,
        secure: isProd, // Only send over HTTPS in production
        sameSite: isProd ? 'none' : 'lax',
        path: '/',
        maxAge: ACCESS_TOKEN_TTL_SECONDS * 1000,
    };
};

export const setAccessTokenCookie = (res, payload) => {
    res.cookie('accessToken', signAccessToken(payload), accessTokenCookieOptions());
};

export const clearAccessTokenCookie = (res) => {
    const isProd = process.env.NODE_ENV === 'production';

    res.clearCookie('accessToken', {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'none' : 'lax',
        path: '/',
    });
};
