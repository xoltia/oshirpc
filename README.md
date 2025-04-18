# OshiRPC

Browser extension for displaying vtubers you are currently viewing using Discord rich presence.
Currently supports Firefox for Windows and Linux.

![preview image](https://github.com/user-attachments/assets/b85fd96a-27e1-492d-9247-a65c8f427f08)


## Building

The build process requires:
- [Zig 0.14.0](https://ziglang.org/download/)
- [Bun](https://bun.sh/)

First, to build the required application from `native` run:
```sh
zig build -Doptimize=ReleaseSafe # Outputs to ./zig-out/bin
```

Now move to the `extension` directory and run the following:
```sh
bun install # Install dependencies
bun run build # Build the extension, outputs to ./dist
```

## Debug Installation
The native manifest can be found in the `native` directory. You will need to change the `path` property to reference the location
to which you have placed the executable. Manifest location is platform specific, see the
[documentation](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Native_manifests) for further guidance. 

The extension files will be in `extension/dist` after following the build steps. Follow [this guide](https://extensionworkshop.com/documentation/develop/temporary-installation-in-firefox/) to temporary load the extension.
