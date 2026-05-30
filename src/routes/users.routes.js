import { Router } from 'express';
import { checkUserState, login, logout, register } from '../controllers/auth.controller.js'
import { authUser } from '../middlewares/authen.middleware.js';
import { getUserProfile, updateUserProfile } from '../controllers/user.controller.js';

export const router = Router()

router.post('/register', register);

router.post('/login' , login);

router.post('/logout', logout);

router.get('/auth/me', authUser, checkUserState);

//Get user profile

router.get('/profile',authUser, getUserProfile);

//Update basic profile

router.put('/profile' ,authUser, updateUserProfile);