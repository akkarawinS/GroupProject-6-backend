import { Router } from 'express';
import { router as adminRouter } from './admin.routes.js';
import { router as productRouter } from './products.routes.js';
import { router as trackRouter } from './tracks.routes.js';
import { router as userRouter } from './users.routes.js';


export const router = Router();

router.use('/v1', userRouter);
router.use('/v1', trackRouter);
router.use('/v1', adminRouter);
router.use('/v1', productRouter);
