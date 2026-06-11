import { LiveSession } from "../models/liveSession.model.js";
import { User } from "../models/user.model.js";

const MOCK_LIVE_COUNT = 4;

const getUserDisplayName = (user) => user?.display_name || user?.username || "Artist";

const formatArtist = (artist) => {
    if (!artist) return null;
    const name = getUserDisplayName(artist);
    return {
        _id: artist._id,
        username: artist.username,
        slug: artist.username || String(artist._id),
        name,
        display_name: artist.display_name,
        profile_picture_url: artist.profile_picture?.url || null,
        avatar_url: artist.profile_picture?.url || null,
        banner_picture_url: artist.banner_picture?.url || null,
        banner_url: artist.banner_picture?.url || artist.profile_picture?.url || null,
        bio: artist.bio || "",
        location: artist.location || "",
        genre: artist.genre || "",
        role: artist.role,
    };
};

const formatLiveSession = (live) => {
    if (!live) return null;
    const data = live.toObject ? live.toObject() : live;

    return {
        ...data,
        artist_id: data.artist_id?._id || data.artist_id,
        artist: data.artist_id && typeof data.artist_id === "object" ? formatArtist(data.artist_id) : null,
        started_at: data.started_at || data.createdAt,
        livekit_room_name: data.livekit_room_name || data._id,
    };
};

const getNextLiveId = async () => {
    const sessions = await LiveSession.find({}, "_id");
    const maxExisting = sessions.reduce((max, session) => {
        const match = /^live_(\d+)$/.exec(session._id);
        if (!match) return max;
        return Math.max(max, Number(match[1]));
    }, MOCK_LIVE_COUNT);

    return `live_${String(maxExisting + 1).padStart(3, "0")}`;
};

const canManageLive = (user, live) => {
    if (user.role === "admin") return true;
    if (user.role !== "artist") return false;
    return String(live.artist_id?._id || live.artist_id) === String(user.user_Id);
};

export const getLiveSessions = async (req, res, next) => {
    try {
        const status = req.query.status || "live";
        const query = {};
        if (status !== "all") query.status = status;

        const lives = await LiveSession.find(query)
            .sort({ started_at: -1, createdAt: -1 })
            .populate("artist_id", "username display_name profile_picture banner_picture bio location genre role");

        return res.status(200).json({
            success: true,
            data: lives.map(formatLiveSession),
        });
    } catch (err) {
        next(err);
    }
};

export const getLiveSessionById = async (req, res, next) => {
    try {
        const live = await LiveSession.findById(req.params.liveId)
            .populate("artist_id", "username display_name profile_picture banner_picture bio location genre role");

        if (!live) {
            return res.status(404).json({ success: false, message: "Live session not found" });
        }

        return res.status(200).json({ success: true, data: formatLiveSession(live) });
    } catch (err) {
        next(err);
    }
};

export const createLiveSession = async (req, res, next) => {
    try {
        if (!["artist", "admin"].includes(req.user.role)) {
            return res.status(403).json({ success: false, message: "Artist or admin role required" });
        }

        const artist = await User.findById(req.user.user_Id).select("username display_name profile_picture banner_picture bio location genre role");
        if (!artist) {
            return res.status(404).json({ success: false, message: "Artist not found" });
        }

        const liveId = await getNextLiveId();
        const title = String(req.body?.title || `${getUserDisplayName(artist)} is live`).trim();
        const description = String(req.body?.description || "").trim();
        const thumbnailUrl = String(req.body?.thumbnail_url || req.body?.thumbnailUrl || artist.banner_picture?.url || artist.profile_picture?.url || "").trim();

        const live = await LiveSession.create({
            _id: liveId,
            artist_id: artist._id,
            title,
            description,
            thumbnail_url: thumbnailUrl,
            provider: "livekit",
            livekit_room_name: liveId,
            status: "live",
            started_at: new Date(),
        });

        await live.populate("artist_id", "username display_name profile_picture banner_picture bio location genre role");

        return res.status(201).json({ success: true, data: formatLiveSession(live) });
    } catch (err) {
        if (err?.code === 11000) {
            err.status = 409;
            err.message = "Live id collision. Please try again.";
        }
        next(err);
    }
};

export const endLiveSession = async (req, res, next) => {
    try {
        const live = await LiveSession.findById(req.params.liveId);
        if (!live) {
            return res.status(404).json({ success: false, message: "Live session not found" });
        }

        if (!canManageLive(req.user, live)) {
            return res.status(403).json({ success: false, message: "You can only manage your own live session" });
        }

        live.status = "ended";
        live.ended_at = new Date();
        await live.save();
        await live.populate("artist_id", "username display_name profile_picture banner_picture bio location genre role");

        return res.status(200).json({ success: true, data: formatLiveSession(live) });
    } catch (err) {
        next(err);
    }
};
