import { Router } from 'express';
import { authUser } from '../middlewares/authen.middleware.js';
import { isArtistOrAdmin } from '../middlewares/roleCheck.middleware.js';
import { createAlbumProduct, createMerchProduct, createSingleProduct, getAllProductInfo, getProductById } from '../controllers/product.controller.js';
import { uploadProductFiles } from '../middlewares/uploadFiles.middleware.js';

export const router = Router();

router.get('/products', getAllProductInfo);

router.get('/products/:productId', getProductById);

router.post('/products/single',authUser,isArtistOrAdmin,uploadProductFiles.fields([{ name: 'audio', maxCount: 1 },{ name: 'cover', maxCount: 1 },]),createSingleProduct,);


router.post('/products/album',authUser,isArtistOrAdmin,uploadProductFiles.fields([
      { name: 'audio', maxCount: 20 },
      { name: 'cover', maxCount: 1 },
    ]),createAlbumProduct);

router.post('/products/merch',authUser,isArtistOrAdmin,uploadProductFiles.fields([
      { name: 'cover', maxCount: 1 },
    ]),createMerchProduct);
