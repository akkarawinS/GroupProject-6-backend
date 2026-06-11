import { User } from "../models/user.model.js";
import { LiveSession } from "../models/liveSession.model.js";
import { createLiveKitToken, getLiveKitConfig } from "../utils/liveKit.js";

const ROOM_NAME_PATTERN = /^[a-zA-Z0-9_-]{3,80}$/;

const normalizeRoomName = (value) => String(value || "").trim();

export const createLiveToken = async (req, res, next) => {
    try {
        const userId = req.user.user_Id;
        const requestedMode = req.body?.mode === "host" ? "host" : "viewer";
        const roomName = normalizeRoomName(req.body?.roomName || req.body?.room_name);

        if (!ROOM_NAME_PATTERN.test(roomName)) {
            return res.status(400).json({
                success: false,
                message: "roomName must be 3-80 characters and use only letters, numbers, underscore, or dash",
            });
        }

        const user = await User.findById(userId).select("username display_name email role");
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const liveSession = await LiveSession.findById(roomName);
        const ownsLiveSession = liveSession
            ? String(liveSession.artist_id) === String(user._id)
            : user.role === "artist";
        const canHost = user.role === "admin" || (user.role === "artist" && ownsLiveSession);
        const mode = requestedMode === "host" && canHost ? "host" : "viewer";
        const canPublish = mode === "host";
        const displayName = user.display_name || user.username || user.email || "Audtlist user";
        const token = await createLiveKitToken({
            identity: `${user._id}`,
            name: displayName,
            roomName,
            canPublish,
        });
        const { serverUrl } = getLiveKitConfig();

        return res.status(200).json({
            success: true,
            data: {
                token,
                serverUrl,
                roomName,
                mode,
                canPublish,
            },
        });
    } catch (err) {
        next(err);
    }
};
