export enum ActivityType {
    PLAYING = 0,
    STREAMING = 1,
    LISTENING = 2,
    WATCHING = 3,
    CUSTOM = 4,
    COMPETING = 5,
};

export type Timestamp = {
    start?: number;
    end?: number;
};

export type Emoji = {
    name: string;
    id?: string;
    animated?: boolean;
};

export type Party = {
    id?: string;
    size?: number[];
};

export type Assets = {
    large_image?: string;
    large_text?: string;
    small_image?: string;
    small_text?: string;
};

export type Secrets = {
    join?: string;
    spectate?: string;
    match?: string;
};

export type Button = {
    label: string;
    url: string;
};

export type Activity = {
    // name: string;
    type: ActivityType;
    url?: string;
    // created_at: number;
    timestamps?: Timestamp;
    application_id?: string;
    details?: string;
    state?: string;
    emoji?: Emoji;
    party?: Party;
    assets?: Assets;
    secrets?: Secrets;
    instance?: boolean;
    flags?: number;
    buttons?: Button[];
};

export class RichPresenceProxy {
    private port: browser.runtime.Port | null;

    constructor(
        public clientId: string,
        public nativeApplication: string = "com.github.xoltia.oshirpc",
    ) {
        this.port = null;
    }

    public connect(): void {
        if (this.connected)
            return;
        this.port = browser.runtime.connectNative(this.nativeApplication);
        this.port.postMessage(this.clientId);
        this.port.onDisconnect.addListener(this.onDisconnect.bind(this));
    }

    public get connected(): boolean {
        return this.port !== null;
    }

    private onDisconnect(port: browser.runtime.Port): void {
        if (port.error)
            console.error("Disconnected from Discord Rich Presence:", port.error);
        this.port = null;
    }

    public setActivity(activity: Activity | null): void {
        if (!this.port) throw new Error("Not connected to Discord Rich Presence");
        this.port.postMessage(activity);
    }
};
