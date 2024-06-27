package main

import (
	"encoding/binary"
	"encoding/json"
	"io"
	"log/slog"
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

func readActivities(r io.Reader, activity chan message) {
	for {
		msgData, err := readMessage(r)
		if err != nil {
			slog.Error("Failed to read message", slog.String("error", err.Error()))
			return
		}

		slog.Debug("Received message", slog.String("message", string(msgData)))

		var msg message
		err = json.Unmarshal(msgData, &msg)
		if err != nil {
			slog.Error("Failed to unmarshal message", slog.String("error", err.Error()))
			continue
		}

		activity <- msg
	}
}
