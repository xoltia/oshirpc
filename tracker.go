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
	activity chan message
	loggedIn bool
	// Amount of time to wait before clearing the presence if no activity is received.
	idleTime time.Duration
	// Acceptable drift in time before updating the presence.
	drift time.Duration
}

func newTracker() *tracker {
	return &tracker{
		activity: make(chan message),
		idleTime: time.Second * 2,
		drift:    time.Millisecond * 1500,
	}
}

func (t *tracker) updatePresence(msg message) {
	handle := path.Base(msg.ChannelURL)
	vtuber, ok := findVtuber(strings.ToLower(handle))
	if !ok {
		slog.Debug("Vtuber not found", slog.String("channelURL", msg.ChannelURL), slog.String("handle", handle))
		return
	}

	agencyIcon, agencyIconExists := agencyIcons[vtuber.Affiliation]

	if !t.loggedIn {
		err := client.Login(clientID)
		if err != nil {
			slog.Error("Failed to login", slog.String("error", err.Error()))
			return
		}
		t.loggedIn = true
	}

	a := client.Activity{
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

	*a.Timestamps.Start = time.Now()
	*a.Timestamps.End = time.Now().Add(time.Duration(msg.TimeLeft) * time.Second)
	slog.Debug("Setting end time", slog.Time("end", *a.Timestamps.End))

	if agencyIconExists {
		a.SmallImage = agencyIcon
		a.SmallText = vtuber.Affiliation
	}

	slog.Debug("Setting activity", slog.Any("activity", a))

	err := client.SetActivity(a)

	if err != nil {
		slog.Error("Failed to set activity", slog.String("error", err.Error()))
		return
	}
}

func (t *tracker) clearPresence() {
	client.Logout()
	t.loggedIn = false
}

func (t *tracker) run(ctx context.Context) {
	ticker := time.NewTicker(t.idleTime)
	defer ticker.Stop()

	lastVideo := ""
	lastTimeLeft := time.Duration(0)

	for {
		select {
		case msg := <-t.activity:
			timeLeft := time.Duration(msg.TimeLeft * float64(time.Second))

			if msg.VideoID != lastVideo {
				t.updatePresence(msg)
				lastVideo = msg.VideoID
				lastTimeLeft = timeLeft
				continue
			}

			ticker.Reset(t.idleTime)
			if lastTimeLeft-timeLeft > t.drift {
				t.updatePresence(msg)
			}
			lastTimeLeft = timeLeft
		case <-ticker.C:
			t.clearPresence()
			lastVideo = ""
			lastTimeLeft = 0
		case <-ctx.Done():
			t.clearPresence()
			return
		}
	}
}
