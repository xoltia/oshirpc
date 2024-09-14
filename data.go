package main

import (
	_ "embed"
	"encoding/json"
)

type vtuber struct {
	URL              string `json:"url"`
	Name             string `json:"name"`
	Affiliation      string `json:"affiliation"`
	Image            string `json:"image"`
	YoutubeHandle    string `json:"youtubeHandle"`
	YoutubeThumbnail string `json:"youtubeThumbnail"`
}

//go:embed vtubers.json
var vtubersJSON []byte

//go:embed agency_icons.json
var agencyIconsJSON []byte

//go:embed agency_channels.json
var agencyChannelsJSON []byte

var (
	vtubers        []vtuber
	agencyIcons    map[string]string
	agencyChannels map[string]string
)

func findVtuber(channelHandle string) (vtuber, bool) {
	for _, vtuber := range vtubers {
		if vtuber.YoutubeHandle == channelHandle {
			return vtuber, true
		}
	}

	return vtuber{}, false
}

func loadData() {
	loadEmbeddedData()
}

func loadEmbeddedData() {
	err := json.Unmarshal(vtubersJSON, &vtubers)
	if err != nil {
		panic(err)
	}

	err = json.Unmarshal(agencyIconsJSON, &agencyIcons)
	if err != nil {
		panic(err)
	}

	err = json.Unmarshal(agencyChannelsJSON, &agencyChannels)
	if err != nil {
		panic(err)
	}
}
