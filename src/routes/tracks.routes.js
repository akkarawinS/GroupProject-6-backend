import { Router } from 'express';
import { createTrack } from '../controllers/track.controller.js';
import { authUser } from '../middlewares/authen.middleware.js';
import { isArtistOrAdmin } from '../middlewares/roleCheck.middleware.js';
import { uploadAudio } from '../middlewares/uploadAudio.middleware.js';

export const router = Router();

router.post('/tracks', authUser, isArtistOrAdmin, uploadAudio.single('audio'), createTrack);
