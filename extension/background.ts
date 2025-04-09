import { RichPresenceProxy, ActivityType } from "./drpc";

const CLIENT_ID = "";

let presence: RichPresenceProxy | null = null;

browser.runtime.onMessage.addListener((message) => {
    if (!presence) {
        console.log("Connecting to Discord Rich Presence");
        presence = new RichPresenceProxy(CLIENT_ID);
        presence.connect();
    }

    if (message.messageType === "UPDATE_PRESENCE_DATA") {
        presence.setActivity({
            name: message.videoTitle,
            type: ActivityType.WATCHING,
            created_at: Date.now(),
        });
    };
});