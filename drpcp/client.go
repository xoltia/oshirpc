package main

import (
	"encoding/binary"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"net"
	"os"
	"path/filepath"
	"strings"
)

type client struct {
	conn io.ReadWriteCloser
}

func newClient(conn net.Conn) *client {
	return &client{conn}
}

func dialIPCDir(dir string) (net.Conn, error) {
	stat, err := os.Stat(dir)
	if err != nil {
		return nil, err
	}
	if !stat.IsDir() {
		return nil, errors.New("not a dir")
	}

	var conn net.Conn
	walkFn := func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return nil
		}
		if d.IsDir() {
			return filepath.SkipDir
		}
		if strings.HasPrefix(d.Name(), "discord-ipc-") {
			conn, err = net.Dial("unix", path)
			if err == nil {
				return filepath.SkipAll
			}
		}
		return nil
	}

	if err := filepath.WalkDir(dir, walkFn); err != nil {
		return nil, fmt.Errorf("walk dir: %w", err)
	}

	return conn, nil
}

func dialIPC() (conn net.Conn, err error) {
	// TODO: Support windows
	dirs := []string{".", "snap.discord", "app/com.discordapp.Discord", "app/com.discordapp.DiscordCanary"}
	temp := os.Getenv("XDG_RUNTIME_DIR")

	if temp == "" {
		temp = fmt.Sprintf("/run/user/%d", os.Getuid())
		if _, err := os.Stat(temp); err != nil {
			temp = os.TempDir()
		}
	}

	for _, dir := range dirs {
		path := filepath.Join(temp, dir)
		conn, err = dialIPCDir(path)
		if err != nil {
			continue
		}
	}

	if conn == nil {
		return nil, fmt.Errorf("ipc: pipe not found")
	}
	return conn, nil
}

func openClient(clientID string) (*client, error) {
	conn, err := dialIPC()
	if err != nil {
		return nil, err
	}
	c := newClient(conn)
	if err := c.handshake(clientID); err != nil {
		_ = conn.Close()
		return nil, err
	}
	return c, nil
}

func (c *client) handshake(clientID string) error {
	var handshakeMessage struct {
		V        int    `json:"v"`
		ClientID string `json:"client_id"`
	}
	handshakeMessage.V = 1
	handshakeMessage.ClientID = clientID
	err := c.writeJSON(0, handshakeMessage)
	if err != nil {
		return err
	}

	header := [8]byte{}
	_, err = io.ReadFull(c.conn, header[:])
	if err != nil {
		return err
	}
	size := binary.NativeEndian.Uint32(header[4:])
	data := make([]byte, size)
	_, err = io.ReadFull(c.conn, data)
	if err != nil {
		return err
	}

	var response struct {
		Code    *int   `json:"code"`
		Message string `json:"message"`
	}
	err = json.Unmarshal(data, &response)
	if err != nil {
		return err
	}
	if response.Code == nil {
		return nil
	}

	return fmt.Errorf("handshake: %s (%d)", response.Message, *response.Code)
}

func (c *client) close() error {
	return c.conn.Close()
}

func (c *client) writeJSON(opcode uint32, v any) error {
	data, err := json.Marshal(v)
	if err != nil {
		return err
	}
	header := [8]byte{}
	binary.NativeEndian.PutUint32(header[0:4], uint32(opcode))
	binary.NativeEndian.PutUint32(header[4:8], uint32(len(data)))
	_, err = c.conn.Write(header[:])
	if err != nil {
		return err
	}
	_, err = c.conn.Write(data)
	return err
}

func (c *client) setActivity(a *activity) error {
	type args struct {
		PID      int       `json:"pid"`
		Activity *activity `json:"activity"`
	}
	type payload struct {
		Cmd  string `json:"cmd"`
		Args args   `json:"args"`
	}

	return c.writeJSON(1, payload{
		Cmd: "SET_ACTIVITY",
		Args: args{
			PID:      os.Getpid(),
			Activity: a,
		},
	})
}
