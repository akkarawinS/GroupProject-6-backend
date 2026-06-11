import { Router } from "express";
import { createLiveToken } from "../controllers/live.controller.js";
import {
    createLiveSession,
    endLiveSession,
    getLiveSessionById,
    getLiveSessions,
} from "../controllers/liveSession.controller.js";
import { authUser } from "../middlewares/authen.middleware.js";

export const router = Router();

router.get("/lives", getLiveSessions);
router.get("/lives/:liveId", getLiveSessionById);
router.post("/lives", authUser, createLiveSession);
router.patch("/lives/:liveId/end", authUser, endLiveSession);
router.post("/livekit/token", authUser, createLiveToken);
