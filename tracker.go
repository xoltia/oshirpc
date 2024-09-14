package main

import (
	"context"
	"fmt"
	"log/slog"
	"path"
	"strings"
	"time"

	"github.com/hugolgst/rich-go/client"
)

const clientID = "505848729119621140"

type tracker struct {
	activity      chan message
	lastVideo     string
	loggedIn      bool
	timeRemaining float64
	lastUpdate    time.Time
}

func newTracker() *tracker {
	return &tracker{
		activity: make(chan message),
	}
}

func handleFromURL(url string) string {
	return path.Base(url)
}

func (t *tracker) updatePresence(msg message) {
	handle := handleFromURL(msg.ChannelURL)

	var activity client.Activity

	if agencyChannel, ok := agencyChannels[handle]; ok {
		agencyIcon := agencyIcons[agencyChannel]
		activity = client.Activity{
			Details:    msg.VideoTitle,
			State:      fmt.Sprintf("Watching %s", agencyChannel),
			LargeImage: agencyIcon,
			LargeText:  handle,
			Timestamps: &client.Timestamps{
				Start: new(time.Time),
				End:   new(time.Time),
			},
		}
	} else if vtuber, ok := findVtuber(strings.ToLower(handle)); ok {
		activity = client.Activity{
			Details:    msg.VideoTitle,
			State:      fmt.Sprintf("Watching %s", vtuber.Name),
			LargeImage: vtuber.YoutubeThumbnail,
			LargeText:  handle,
			Buttons: []*client.Button{
				{
					Label: "Watch on YouTube",
					Url:   fmt.Sprintf("https://www.youtube.com/watch?v=%s", msg.VideoID),
				},
				{
					Label: "VTuber Info",
					Url:   vtuber.URL,
				},
			},
			Timestamps: &client.Timestamps{
				Start: new(time.Time),
				End:   new(time.Time),
			},
		}

		agencyIcon, agencyIconExists := agencyIcons[vtuber.Affiliation]

		if agencyIconExists {
			activity.SmallImage = agencyIcon
			activity.SmallText = vtuber.Affiliation
		}
	} else {
		slog.Debug("Vtuber not found", slog.String("channelURL", msg.ChannelURL), slog.String("handle", handle))
		if t.loggedIn && time.Since(t.lastUpdate) > 2*time.Second {
			t.clearPresence()
		}
		return
	}

	if !t.loggedIn {
		err := client.Login(clientID)
		if err != nil {
			slog.Error("Failed to login", slog.String("error", err.Error()))
			return
		}
		t.loggedIn = true
	}

	*activity.Timestamps.Start = time.Now()
	*activity.Timestamps.End = time.Now().Add(time.Duration(msg.TimeLeft) * time.Second)
	slog.Debug("Setting end time", slog.Time("end", *activity.Timestamps.End))

	slog.Debug("Setting activity", slog.Any("activity", activity))
	err := client.SetActivity(activity)

	if err != nil {
		slog.Error("Failed to set activity", slog.String("error", err.Error()))
		return
	}

	t.lastVideo = msg.VideoID
	t.timeRemaining = msg.TimeLeft
	t.lastUpdate = time.Now()
}

func (t *tracker) clearPresence() {
	client.Logout()
	t.lastVideo = ""
	t.timeRemaining = 0
	t.loggedIn = false
}

func (t *tracker) run(ctx context.Context) {
	for {
		select {
		case msg := <-t.activity:
			if msg.VideoID != t.lastVideo {
				t.updatePresence(msg)
			} else if t.timeRemaining-msg.TimeLeft > 1.5 {
				t.updatePresence(msg)
			} else {
				t.timeRemaining = msg.TimeLeft
			}
		case <-time.After(2 * time.Second):
			t.clearPresence()
		case <-ctx.Done():
			t.clearPresence()
			return
		}
	}
}
