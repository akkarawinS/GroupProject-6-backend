import { Router } from 'express';
import { authUser } from '../middlewares/authen.middleware.js';
import { isArtistOrAdmin } from '../middlewares/roleCheck.middleware.js';
import { getAllProductInfo, getProductById } from '../controllers/product.controller.js';

export const router = Router();

router.get('/products', getAllProductInfo);

router.get('/products/:productId', getProductById);

// router.post('/prodcuts',authUser,isArtistOrAdmin,createProduct);