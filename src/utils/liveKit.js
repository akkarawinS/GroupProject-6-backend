import { AccessToken } from "livekit-server-sdk";

const LIVEKIT_TOKEN_TTL = "2h";

export const getLiveKitConfig = () => {
    const serverUrl = process.env.LIVEKIT_URL;
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!serverUrl || !apiKey || !apiSecret) {
        const err = new Error("LiveKit is not configured. Set LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET.");
        err.status = 500;
        throw err;
    }

    return { serverUrl, apiKey, apiSecret };
};

export const createLiveKitToken = async ({
    identity,
    name,
    roomName,
    canPublish = false,
}) => {
    const { apiKey, apiSecret } = getLiveKitConfig();
    const token = new AccessToken(apiKey, apiSecret, {
        identity,
        name,
        ttl: LIVEKIT_TOKEN_TTL,
    });

    token.addGrant({
        room: roomName,
        roomJoin: true,
        canPublish,
        canPublishData: true,
        canSubscribe: true,
    });

    return token.toJwt();
};
