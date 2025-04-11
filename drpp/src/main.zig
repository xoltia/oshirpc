const std = @import("std");
const DiscordIpc = @import("DiscordIpc.zig");
const NativeMessenger = @import("NativeMessenger.zig");

pub fn main() !void {
    const stdin = std.io.getStdIn();
    const stdout = std.io.getStdOut();
    const native = NativeMessenger.init(stdin, stdout);

    std.log.debug("Awaiting handshake", .{});
    var buffer: [2048]u8 = undefined;
    var len = try native.read(&buffer);

    if (len < 2) {
        std.log.err("Invalid client id string", .{});
        return;
    }

    const client_id = buffer[1 .. len - 1];
    std.log.debug("Recv handshake: {s}", .{client_id});

    const client = DiscordIpc.open(client_id) catch |err| {
        std.log.err("Unable to connect: {?}", .{err});
        return;
    };

    while (true) {
        len = try native.read(&buffer);
        std.log.debug("Recv: {s}", .{buffer[0..len]});
        try client.writeActivityMessage(buffer[0..len]);
    }
}
