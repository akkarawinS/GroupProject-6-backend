import { Router } from 'express';
import { getAllUsers } from '../controllers/admin.controller.js';
import { authUser } from '../middlewares/authen.middleware.js';
import { isAdmin } from '../middlewares/roleCheck.middleware.js';

export const router = Router();


router.get('/admin/getUserInfo', authUser, isAdmin, getAllUsers);
