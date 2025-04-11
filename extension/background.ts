import { RichPresenceProxy, ActivityType, type Activity } from "./drpc";

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

browser.runtime.onMessage.addListener((message) => {
    console.log("Received message:", message);

    // Reset timeout
    clearTimeout(timeout);
    timeout = setTimeout(() => {
        console.log("Clearing presence due to timeout");
        clearPresence();
    }, 3000);

    if (currentVideoId === message.videoId) {
        console.log("Ignoring duplicate video ID");
        return;
    }

    currentVideoId = message.videoId;

    if (message.messageType === "UPDATE_PRESENCE_DATA") {
        console.log("Updating presence with data:", message);
        updatePresence({
            type: ActivityType.WATCHING,
        });
    }
});
