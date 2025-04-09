const std = @import("std");
const DiscordIpc = @import("DiscordIpc.zig");
const NativeMessenger = @import("NativeMessenger.zig");

pub fn main() !void {
    const stdin = std.io.getStdIn();
    const stdout = std.io.getStdOut();
    const native = NativeMessenger.init(stdin, stdout);

    var buffer: [2048]u8 = undefined;
    var len = try native.read(&buffer);

    const client_id = buffer[0..len];
    const client = try DiscordIpc.open(client_id);

    while (true) {
        len = try native.read(&buffer);
        try client.writeActivityMessage(buffer[0..len]);
    }
}
