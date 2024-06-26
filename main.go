package main

import (
	_ "embed"
	"encoding/binary"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"os"
	"path"
	"path/filepath"
	"strings"
	"time"

	"github.com/hugolgst/rich-go/client"
)

type message struct {
	Type       string  `json:"messageType"`
	ChannelURL string  `json:"channelUrl"`
	VideoID    string  `json:"videoId"`
	VideoTitle string  `json:"title"`
	TimeLeft   float64 `json:"timeLeft"`
}

func readMessage(r io.Reader) (payload []byte, err error) {
	var header [4]byte
	_, err = io.ReadFull(r, header[:])
	if err != nil {
		return
	}
	len := binary.NativeEndian.Uint32(header[:])
	payload = make([]byte, len)
	_, err = io.ReadFull(r, payload)
	return
}

func getLogFileName() (string, error) {
	xdgStateHome := os.Getenv("XDG_STATE_HOME")
	if xdgStateHome != "" {
		return filepath.Join(xdgStateHome, "oshirpc", "log.jsonl"), nil
	}

	home := os.Getenv("HOME")
	if home != "" {
		return filepath.Join(home, ".local", "state", "oshirpc", "log.jsonl"), nil
	}

	return "", errors.New("failed to get log file name")
}

type vtuber struct {
	URL              string `json:"url"`
	Name             string `json:"name"`
	Affiliation      string `json:"affiliation"`
	Image            string `json:"image"`
	YoutubeHandle    string `json:"youtubeHandle"`
	YoutubeThumbnail string `json:"youtubeThumbnail"`
}

const clientID = "505848729119621140"

//go:embed vtubers.json
var vtubersJSON []byte

//go:embed agency_icons.json
var agencyIconsJSON []byte

var (
	vtubers     []vtuber
	agencyIcons map[string]string
)

func findVtuber(channelHandle string) (vtuber, bool) {
	for _, vtuber := range vtubers {
		if vtuber.YoutubeHandle == channelHandle {
			return vtuber, true
		}
	}

	return vtuber{}, false
}

func init() {
	err := json.Unmarshal(vtubersJSON, &vtubers)
	if err != nil {
		panic(err)
	}

	err = json.Unmarshal(agencyIconsJSON, &agencyIcons)
	if err != nil {
		panic(err)
	}
}

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

func handleFromURL(url string) string {
	return path.Base(url)
}

func (t *tracker) updatePresence(msg message) {
	handle := handleFromURL(msg.ChannelURL)
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

func (t *tracker) run() {
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
		}
	}
}

func main() {
	logFileName, err := getLogFileName()
	if err != nil {
		panic(err)
	}

	stateDir := filepath.Dir(logFileName)
	err = os.MkdirAll(stateDir, 0755)
	if err != nil {
		panic(err)
	}

	logFile, err := os.Create(logFileName)
	if err != nil {
		panic(err)
	}
	defer logFile.Close()

	tracker := newTracker()
	go tracker.run()

	slog.SetDefault(
		slog.New(slog.NewJSONHandler(logFile, &slog.HandlerOptions{
			Level: slog.LevelDebug,
		})),
	)

	for {
		msgData, err := readMessage(os.Stdin)
		if err != nil {
			slog.Error("Failed to read message", slog.String("error", err.Error()))
			break
		}

		slog.Debug("Received message", slog.String("message", string(msgData)))

		var msg message
		err = json.Unmarshal(msgData, &msg)
		if err != nil {
			slog.Error("Failed to unmarshal message", slog.String("error", err.Error()))
			continue
		}

		tracker.activity <- msg
	}
}
