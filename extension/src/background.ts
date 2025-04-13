import { RichPresenceProxy, ActivityType, type Activity } from "./drpc";
import type { DocumentData } from "./content";
import data from "../data.json" with { type: "json" };

type VTuber = {
    id: string;
    customUrl: string;
    twitch: string | null;
    photo: string;
    org: string;
};

// Map of either handle format (@vtuber) or ID format (UC...)
const vtubers = data as VTuber[];
const CLIENT_ID = "505848729119621140";
const USE_JP = browser.i18n.getUILanguage().startsWith("ja");

let presence: RichPresenceProxy | null = null;
let currentVideoId: string | null = null;
let timeout: any = undefined;

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

browser.runtime.onMessage.addListener((message: DocumentData) => {
    console.log("Received message:", message);

    // Reset timeout
    clearTimeout(timeout);
    timeout = setTimeout(() => {
        console.log("Clearing presence due to timeout");
        clearPresence();
    }, 3000);

    if (!message.channelUrl)
        return;

    if (message.videoId === currentVideoId) {
        console.log("Video ID is the same, skipping presence update");
        return;
    }

    let handleOrId = message.channelUrl.split('/').pop();

    if (!handleOrId) {
        console.error("Channel URL is malformed:", message.channelUrl);
        return;
    } else if (handleOrId.startsWith("@")) {
        handleOrId = handleOrId.toLowerCase();
    }

    const channel = vtubers.find((vtuber) => {
        return vtuber.id === handleOrId || vtuber.customUrl === handleOrId;
    });

    if (!channel) {
        console.error("Channel not found:", handleOrId);
        return;
    }

    currentVideoId = message.videoId;
    console.log("Updating presence with data:", message);
    updatePresence({
        type: ActivityType.WATCHING,
        details: message.title ?? "",
        state: message.author ?? "",
        assets: {
            large_image: channel.photo,
            small_image: channel.org.toLowerCase(),
        },
        buttons: [
            {
                label: USE_JP ? "YouTubeで視聴" : "Watch on YouTube",
                url: `https://www.youtube.com/watch?v=${message.videoId}`,
            },
            {
                label: USE_JP ? "チャンネルを訪問" : "Visit Channel",
                url: message.channelUrl,
            },
        ],
    });
});
