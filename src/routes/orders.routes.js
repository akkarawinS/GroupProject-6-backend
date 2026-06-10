import { Router } from 'express';
import { createOrder, getOrderById, getOrders } from '../controllers/order.controller.js';
import { authUser } from '../middlewares/authen.middleware.js';

export const router = Router();

router.get('/orders', authUser, getOrders);
router.get('/orders/:orderId', authUser, getOrderById);
router.post('/orders', authUser, createOrder);
