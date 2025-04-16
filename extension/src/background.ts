import { RichPresenceProxy, ActivityType, type Activity } from "./drpc";
import type { DocumentData } from "./content";
import Holodex, { type Channel } from "./holodex";
import ExpiringCache from "./cache";

const CLIENT_ID = "505848729119621140";
const USE_JA = browser.i18n.getUILanguage().startsWith("ja");

let presence: RichPresenceProxy | null = null;
let currentVideoId: string | null = null;
let lastTime: number | null = null;
const channelCache = new ExpiringCache(localStorage, "holodex-channel-cache");

function updatePresence(activity: Activity) {
    try {
        if (!presence) {
            console.log("Connecting to Discord Rich Presence");
            presence = new RichPresenceProxy(CLIENT_ID);
            presence.connect();
        }
        presence.setActivity(activity);
    } catch {
        presence = null;
        currentVideoId = null;
    }
}

function clearPresence() {
    if (presence) {
        presence.setActivity(null);
        currentVideoId = null;
    }
}

async function getHolodex(): Promise<Holodex> {
    console.log("Fetching Holodex API key from storage");
    const item = await browser.storage.local.get("holodexApiKey");
    console.log("Holodex API key fetched:", item);
    const apiKey = item.holodexApiKey;
    if (!apiKey) {
        console.error("Holodex API key not found in storage");
        throw new Error("Holodex API key not found");
    }
    console.log("Creating Holodex instance with API key", apiKey);
    return new Holodex(apiKey);
}

async function getVtuberChannel(id: string): Promise<Channel | null> {
    const channel: Channel | "invalid" | null = channelCache.get(id);
    if (channel === null) {
        console.log("Channel not found in cache, fetching from Holodex");
        const holodex = await getHolodex();
        const fetchedChannel = await holodex.getChannel(id);
        console.log("Fetched channel:", fetchedChannel);
        if (fetchedChannel) {
            channelCache.set(id, fetchedChannel, 60 * 60 * 24 * 1); // 1 day
            return fetchedChannel;
        } else {
            channelCache.set(id, "invalid", 60 * 60 * 24 * 7); // 7 days
            return null;
        }
    } else if (channel === "invalid") {
        console.log("Cached channel is not a vtuber or does not exist:", id);
        return null;
    } else if (channel.type !== "vtuber") {
        console.log("Cached channel is not a vtuber:", channel);
        return null;
    } else {
        console.log("Channel found in cache:", channel);
        return channel;
    }
}

browser.runtime.onMessage.addListener((message: DocumentData) => {
    console.log("Received message:", message);
    if (!message.channelUrl)
        return;

    if (message.videoId === currentVideoId) {
        console.log("Video ID is the same, skipping presence update");
        lastTime = Date.now();
        return;
    }

    let handleOrId = message.channelUrl.split('/').pop();

    if (!handleOrId) {
        console.error("Channel URL is malformed:", message.channelUrl);
        return;
    } else if (handleOrId.startsWith("@")) {
        handleOrId = handleOrId.toLowerCase();
    }

    getVtuberChannel(handleOrId)
        .then(channel => {
            if (!channel) return;

            currentVideoId = message.videoId;

            console.log("Updating presence with data:", message);
            console.log("Channel data:", channel);

            updatePresence({
                type: ActivityType.WATCHING,
                details: message.title ?? "",
                state: message.author ?? channel.name,
                assets: {
                    large_image: channel.photo,
                    small_image: channel.org.toLowerCase(),
                },
                buttons: [
                    {
                        label: USE_JA ? "YouTubeで視聴" : "Watch on YouTube",
                        url: `https://www.youtube.com/watch?v=${message.videoId}`,
                    },
                    {
                        label: USE_JA ? "チャンネルを訪問" : "Visit Channel",
                        url: message.channelUrl!,
                    },
                ],
            });
            lastTime = Date.now();
        }).catch((error) => {
            console.error("Error fetching channel:", error);
            clearPresence();
        });
});

setInterval(() => {
    if (presence && lastTime && Date.now() - lastTime > 3000) {
        console.log("Clearing presence due to timeout");
        clearPresence();
    }
}, 5000);
