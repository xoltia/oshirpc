package main

import (
	"os"
)

func main() {
	var handshake struct {
		ClientID string `json:"client_id"`
	}

	err := readNativeMessage(os.Stdin, &handshake)
	if err != nil {
		panic(err)
	}

	var client *client

	for {
		var a *activity
		var response struct {
			Error *string `json:"error"`
		}

		err = readNativeMessage(os.Stdin, &a)
		if err != nil {
			panic(err)
		}

		if client == nil {
			client, err = openClient(handshake.ClientID)
			if err != nil {
				errStr := err.Error()
				response.Error = &errStr
				if err = writeNativeMessage(os.Stdout, response); err != nil {
					panic(err)
				}
			}
		}

		err = client.setActivity(a)
		if err != nil {
			client.close()
			client = nil
			errStr := err.Error()
			response.Error = &errStr
		} else {
			response.Error = nil
		}

		if err = writeNativeMessage(os.Stdout, response); err != nil {
			panic(err)
		}
	}
}
