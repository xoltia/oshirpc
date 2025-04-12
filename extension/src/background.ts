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

const vtubers = new Map<string, VTuber>(data.map((vtuber: VTuber) => [vtuber.customUrl.slice(1), vtuber]));

const CLIENT_ID = "505848729119621140";

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

    const channel = vtubers.get(message.channelUrl.split('@')[1]);
    if (!channel) {
        console.warn("Channel not found:", message.channelUrl);
        return;
    }

    if (currentVideoId === message.videoId) {
        console.log("Ignoring duplicate video ID");
        return;
    }

    currentVideoId = message.videoId;
    console.log("Updating presence with data:", message);
    updatePresence({
        type: ActivityType.WATCHING,
        details: message.title ?? 'Unknown Title',
        state: message.author ?? 'Unknown Author',
        assets: {
            large_image: channel.photo,
            small_image: channel.org,
        },
    });
});
