import { Router } from 'express';
import { authUser } from '../middlewares/authen.middleware.js';
import { isArtistOrAdmin } from '../middlewares/roleCheck.middleware.js';
import { createProduct, getAllProductInfo, getProductById } from '../controllers/product.controller.js';
import { uploadProductFiles } from '../middlewares/uploadFiles.middleware.js';

export const router = Router();

router.get('/products', getAllProductInfo);

router.get('/products/:productId', getProductById);

router.post('/products',authUser,isArtistOrAdmin,uploadProductFiles.fields([{ name: 'audio', maxCount: 1 },{ name: 'cover', maxCount: 1 },]),createProduct,);
