package main

import (
	"strconv"
	"time"
)

type activityType int

type activity struct {
	Name          string       `json:"name"`
	Type          activityType `json:"type"`
	URL           *string      `json:"url,omitempty"`
	CreatedAt     timestamp    `json:"created_at"`
	Timestamps    *timestamps  `json:"timestamps,omitempty"`
	ApplicationID *string      `json:"application_id,omitempty"`
	Details       *string      `json:"details,omitempty"`
	State         *string      `json:"state,omitempty"`
	Emoji         *emoji       `json:"emoji,omitempty"`
	Party         *party       `json:"party,omitempty"`
	Assets        *assets      `json:"assets,omitempty"`
	Secrets       *secrets     `json:"secrets,omitempty"`
	Instance      *bool        `json:"instance,omitempty"`
	Flags         int          `json:"flags"`
	Buttons       []button     `json:"buttons,omitempty"`
}

type timestamps struct {
	Start *timestamp `json:"start,omitempty"`
	End   *timestamp `json:"end,omitempty"`
}

type timestamp time.Time

func (ts *timestamp) UnmarshalJSON(b []byte) error {
	unixTime, err := strconv.ParseInt(string(b), 10, 64)
	if err != nil {
		return err
	}
	*ts = timestamp(time.UnixMilli(unixTime))
	return nil
}

func (ts timestamp) MarshalJSON() ([]byte, error) {
	unixTime := time.Time(ts).UnixMilli()
	tsString := strconv.FormatInt(unixTime, 10)
	return []byte(tsString), nil
}

type emoji struct {
	Name     string  `json:"name"`
	ID       *string `json:"id,omitempty"`
	Animated *bool   `json:"animated,omitempty"`
}

type party struct {
	ID   *string `json:"id,omitempty"`
	Size *[2]int `json:"size,omitempty"`
}

type assets struct {
	LargeImage *string `json:"large_image,omitempty"`
	LargeText  *string `json:"large_text,omitempty"`
	SmallImage *string `json:"small_image,omitempty"`
	SmallText  *string `json:"small_text,omitempty"`
}

type secrets struct {
	Join     *string `json:"join,omitempty"`
	Match    *string `json:"match,omitempty"`
	Spectate *string `json:"spectate,omitempty"`
}

type button struct {
	Label string `json:"label"`
	URL   string `json:"url"`
}
