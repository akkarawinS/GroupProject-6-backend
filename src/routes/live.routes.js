import { Router } from "express";
import { createLiveToken } from "../controllers/live.controller.js";
import { authUser } from "../middlewares/authen.middleware.js";

export const router = Router();

router.post("/livekit/token", authUser, createLiveToken);
