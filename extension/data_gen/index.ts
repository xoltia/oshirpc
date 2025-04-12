import Holodex, { type Channel } from "./holodex";
import { fetchYoutubeChannelDetails } from "./youtube";

const apiKey = Bun.env.HOLODEX_API_KEY;
const youtubeApiKey = Bun.env.YOUTUBE_API_KEY;
if (!apiKey)
    throw new Error("Holodex API key is not set");
if (!youtubeApiKey)
    throw new Error("YouTube API key is not set");

const holodex = new Holodex(apiKey);
const vtubers = [];
const ids = new Set();
let offset = 0;

while (true) {
    console.log(`Fetching vtubers from offset ${offset}`);
    const batch = await holodex.listChannels({ type: "vtuber", offset, limit: 50 });

    if (batch.length === 0)
        break;

    for (const vtuber of batch) {
        if (ids.has(vtuber.id))
            continue;
        ids.add(vtuber.id);
        vtubers.push(vtuber);
    }

    offset += batch.length;
}

Bun.write("vtubers.json", JSON.stringify(vtubers, null, 2));
console.log(`Fetched ${vtubers.length} vtubers`);
console.log("vtubers.json created");

// const vtubers = await Bun.file("vtubers.json").json() as Channel[];

const batchSize = 50;
const batches = Math.ceil(vtubers.length / batchSize);
const youtubeChannels = [];

for (let i = 0; i < batches; i++) {
    const batch = vtubers.slice(i * batchSize, (i + 1) * batchSize);
    const ids = batch.map((vtuber) => vtuber.id);
    const channels = await fetchYoutubeChannelDetails(youtubeApiKey, ids);
    youtubeChannels.push(...channels);
}

Bun.write("youtube_channels.json", JSON.stringify(youtubeChannels, null, 2));
console.log(`Fetched ${youtubeChannels.length} youtube channels`);
console.log("youtube_channels.json created");
console.log("Done");
