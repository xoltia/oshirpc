export type Channel = {
    id: string,
    name: string,
    english_name: string,
    type: "vtuber" | "clipper",
    org: string,
    group: string,
    photo: string,
    banner: string,
    twitter: string,
    video_count: string,
    subscriber_count: string,
    view_count: string,
    clip_count: string,
    lang: string,
    published_at: string,
    inactive: boolean,
    description: string
    twitch: string | null,
};

export type ChannelQuery = {
    type?: Channel["type"];
    offset?: number;
    limit?: number;
    org?: string;
    lang?: string;
    sort?: keyof Channel;
    order?: "asc" | "desc";
};

export default class Holodex {
    private apiKey: string;
    private apiUrl: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
        this.apiUrl = "https://holodex.net/api/v2";
    }

    async listChannels(query: ChannelQuery): Promise<Channel[]> {
        const url = new URL(`${this.apiUrl}/channels`);
        const headers = { 'X-APIKEY': this.apiKey };

        for (const [key, value] of Object.entries(query)) {
            if (value !== undefined) {
                url.searchParams.append(key, value.toString());
            }
        }

        const response = await fetch(url.toString(), { headers });
        if (!response.ok) {
            throw new Error(`Error fetching channels: ${response.statusText}`);
        }
        return response.json();
    }
}
