const std = @import("std");
const DiscordIpc = @import("DiscordIpc.zig");
const NativeMessenger = @import("NativeMessenger.zig");

pub fn main() !void {
    var gpa = std.heap.DebugAllocator(.{}){};
    var sfa = std.heap.stackFallback(2 << 14, gpa.allocator());
    defer _ = gpa.deinit();
    const allocator = sfa.get();
    const stdin = std.io.getStdIn();
    const stdout = std.io.getStdOut();
    const native = NativeMessenger.init(stdin, stdout);

    std.log.debug("Awaiting handshake", .{});
    var message = try native.read(allocator);

    if (message.len < 2) {
        std.log.err("Invalid client id string: {s}", .{message});
        return;
    }

    const client_id = message[1 .. message.len - 1];
    std.log.debug("Recv handshake: {s}", .{client_id});

    const client = DiscordIpc.open(allocator, client_id) catch |err| {
        std.log.err("Unable to connect: {?}", .{err});
        return;
    };
    defer client.close();

    while (true) {
        allocator.free(message);
        message = try native.read(allocator);
        std.log.debug("Recv: {s}", .{message});
        try client.writeActivityMessage(message);
    }
}
