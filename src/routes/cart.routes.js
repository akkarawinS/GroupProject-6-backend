import { Router } from 'express';
import {
    deleteCart,
    deleteCartItem,
    getCartItem,
    patchCartItem,
    postCartItem,
} from '../controllers/cart.controller.js';
import { authUser } from '../middlewares/authen.middleware.js';

export const router = Router();

router.get('/cart', authUser, getCartItem);

//add item to cart
router.post('/cart/items', authUser, postCartItem);

router.patch('/cart/items/:itemId', authUser, patchCartItem);

router.delete('/cart/items/:itemId', authUser, deleteCartItem);

router.delete('/cart', authUser, deleteCart);
