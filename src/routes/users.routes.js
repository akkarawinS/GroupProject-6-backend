import { Router } from 'express';
import { checkUserState, login, logout, register } from '../controllers/auth.controller.js'
import { authUser } from '../middlewares/authen.middleware.js';

export const router = Router()

router.post('/register', register);

router.post('/login' , login);

router.post('/logout', logout);

router.get('/auth/me', authUser, checkUserState);