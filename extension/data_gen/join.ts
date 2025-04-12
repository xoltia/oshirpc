import type { Channel } from "./holodex";
import type { YoutubeChannelDetails } from "./youtube";

type ExportedChannel = {
    id: string;
    customUrl: string;
    twitch: string | null;
    photo: string;
    org: string;
};

const vtubers = await Bun.file("vtubers.json").json() as Channel[];
const channels = await Bun.file("youtube_channels.json").json() as YoutubeChannelDetails[];
const channelsMap = new Map<string, YoutubeChannelDetails>(channels.map(channel => [channel.id, channel]));
const exportedChannels: ExportedChannel[] = [];

for (const vtuber of vtubers) {
    const channel = channelsMap.get(vtuber.id);

    if (!channel) {
        console.warn(`Channel not found for vtuber ${vtuber.id} (${vtuber.name}, ${vtuber.subscriber_count})`);
        continue;
    }

    const exportedChannel: ExportedChannel = {
        id: vtuber.id,
        customUrl: channel?.snippet.customUrl || "",
        twitch: vtuber.twitch,
        photo: vtuber.photo,
        org: vtuber.org,
    };

    exportedChannels.push(exportedChannel);
}

await Bun.write("data.json", JSON.stringify(exportedChannels, null, 2));
console.log("Exported channels to data.json");
