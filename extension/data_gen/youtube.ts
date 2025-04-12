type YoutubeChannelDetailsResponse = {
    items: YoutubeChannelDetails[],
}

export type YoutubeChannelDetails = {
    id: string,
    snippet: {
        title: string,
        description: string,
        publishedAt: string,
        customUrl: string,
        thumbnails: {
            default: {
                url: string,
            },
            medium: {
                url: string,
            },
            high: {
                url: string,
            },
        },
    },
}

export async function fetchYoutubeChannelDetails(apiKey: string, ids: string[]): Promise<YoutubeChannelDetails[]> {
    const response = await fetch(
        'https://www.googleapis.com/youtube/v3/channels?' +
        `key=${apiKey}&` +
        `id=${ids.join(',')}&` +
        'part=snippet,contentDetails'
    );

    if (!response.ok) {
        throw new Error(`Error fetching YouTube channel details: ${response.statusText}`);
    }

    const data: YoutubeChannelDetailsResponse = await response.json();
    return data.items;
}
