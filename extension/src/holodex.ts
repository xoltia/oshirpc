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

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    private async fetch(route: string): Promise<Response> {
        const response = await fetch(
            `https://holodex.net/api/v2${route}`,
            { headers: { 'X-APIKEY': this.apiKey } }
        );
        return response;
    }

    async getChannel(id: string): Promise<Channel | null> {
        const response = await this.fetch(`/channels/${id}`);
        if (response.status === 404)
            return null;
        if (!response.ok)
            throw new Error(`Failed to fetch channel: ${response.statusText}`);
        return response.json();
    }

    async listChannels(query: ChannelQuery): Promise<Channel[]> {
        const params = new URLSearchParams();
        for (const [key, value] of Object.entries(query)) {
            if (value !== undefined)
                params.append(key, value.toString());
        }
        const response = await this.fetch(`/channels?${params.toString()}`);
        if (!response.ok)
            throw new Error(`Failed to fetch channels: ${response.statusText}`);
        return response.json();
    }
}
