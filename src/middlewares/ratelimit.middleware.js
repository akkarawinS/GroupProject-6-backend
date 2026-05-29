import { rateLimit } from 'express-rate-limit';

export const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 mins
    max: 100, // limit each IP to 100 requests
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many requests.',

});