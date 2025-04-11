import { RichPresenceProxy, ActivityType } from "./drpc";

const CLIENT_ID = "505848729119621140";

let presence: RichPresenceProxy | null = null;
let currentVideoId: string | null = null;

browser.runtime.onMessage.addListener((message) => {
    console.log("Received message:", message);

    if (currentVideoId === message.videoId) {
        console.log("Ignoring duplicate video ID");
        return;
    }

    currentVideoId = message.videoId;

    try {
        if (!presence) {
            console.log("Connecting to Discord Rich Presence");
            presence = new RichPresenceProxy(CLIENT_ID);
            presence.connect();
        }

        if (message.messageType === "UPDATE_PRESENCE_DATA") {
            presence.setActivity({
                name: message.title,
                type: ActivityType.PLAYING,
                created_at: Date.now(),
            });
        };
    } catch {
        presence = null;
    }
});
