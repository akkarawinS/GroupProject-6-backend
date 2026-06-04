import { Router } from 'express';
import { artistRegister, checkUserState, fanRegister, login, logout } from '../controllers/auth.controller.js'
import { authUser } from '../middlewares/authen.middleware.js';
import { getUserProfile, toggleFollowArtist, toggleWishlist, updateUserProfile } from '../controllers/user.controller.js';

export const router = Router()

//Register
router.post('/auth/register/fan', fanRegister);

router.post('/auth/register/artist', artistRegister);



router.post('/auth/login' , login);

router.post('/logout', logout);
  
// authUser reads the cookie token and sets req.user for the controller.
router.get('/auth/me', authUser, checkUserState);

//Get user profile
router.get('/profile',authUser, getUserProfile);

//Update user profile
router.put('/profile' ,authUser, updateUserProfile);

//favorute artist tooggle route;
router.patch('/artists/:artistId/follow',authUser,toggleFollowArtist);

//add item to wishlist tooggle route;
router.patch('/products/:productId/wishlist',authUser,toggleWishlist);

 