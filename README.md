# OshiRPC

OshiRPC provides Discord rich presence functionality for displaying VTubers you are
currently watching on YouTube. Made to work with Firefox on Linux.

![image](https://github.com/xoltia/oshirpc/assets/38849891/7c668eb8-e81e-4a79-be16-366ca3e4c679)


## Setup
1. Install the extension.
2. Build and install the native application (ex. `go install github.com/xoltia/oshirpc`).
3. Install the native manifest. Change the `path` field in `native_manifest.json` to the install path of
   the native application (`$GOBIN/oshirpc` or `$HOME/go/bin/oshirpc` by default if installed as shown above). Next, move
   the `native_manifest.json` to the config directory (ex. `cp native_manifest.json ~/.mozilla/com.github.xoltia.oshirpc.json`).

## Credit
- Extension code based on [YouTubeDiscordPresence](https://github.com/XFG16/YouTubeDiscordPresence).
- Data from [Hololist](https://hololist.net) and can be found [here](https://github.com/xoltia/vtuber-database).
