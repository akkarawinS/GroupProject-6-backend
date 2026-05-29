import { Router } from 'express';
import { register } from '../controllers/auth.controller.js'

export const router = Router()

router.post('/register', register);