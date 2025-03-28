package main

import (
	"encoding/binary"
	"encoding/json"
	"io"
)

func readNativeMessage(r io.Reader, v any) error {
	sizeBuffer := [4]byte{}
	_, err := io.ReadFull(r, sizeBuffer[:])
	if err != nil {
		return err
	}
	size := binary.NativeEndian.Uint32(sizeBuffer[:])
	data := make([]byte, size)
	_, err = io.ReadFull(r, data)
	if err != nil {
		return err
	}
	return json.Unmarshal(data, v)
}

func writeNativeMessage(w io.Writer, v any) error {
	data, err := json.Marshal(v)
	if err != nil {
		return err
	}
	sizeBuffer := [4]byte{}
	binary.NativeEndian.PutUint32(sizeBuffer[:], uint32(len(data)))
	_, err = w.Write(sizeBuffer[:])
	if err != nil {
		return err
	}
	_, err = w.Write(data)
	return err
}
