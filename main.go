package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	"github.com/adrg/xdg"
)

func initLogger() {
	logFileName, err := xdg.StateFile("oshirpc/log.jsonl")
	if err != nil {
		panic(err)
	}

	logFile, err := os.Create(logFileName)
	if err != nil {
		panic(err)
	}
	defer logFile.Close()

	slog.SetDefault(
		slog.New(slog.NewJSONHandler(logFile, &slog.HandlerOptions{
			Level: slog.LevelDebug,
		})),
	)
}

func main() {
	loadData()
	initLogger()

	ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	closed := make(chan struct{})
	tracker := newTracker()

	go func() {
		tracker.run(ctx)
		close(closed)
	}()

	go func() {
		readActivities(os.Stdin, tracker.activity)
		slog.Info("Read returned, exiting")
		cancel()
	}()

	<-ctx.Done()
	<-closed
}
