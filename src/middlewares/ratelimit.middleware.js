import { rateLimit } from 'express-rate-limit';

const isProduction = process.env.NODE_ENV === 'production';

export const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 mins
    max: isProduction ? 300 : 3000,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.method === 'OPTIONS',
    message: {
        success: false,
        message: 'Too many requests. Please try again later.',
    },
});
