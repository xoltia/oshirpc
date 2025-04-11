const std = @import("std");
const builtin = @import("builtin");
const native_endian = builtin.cpu.arch.endian();

// Max size to accept from Discord. Errors if larger value recieved.
const MAX_RECV = 1 << 26;
const Self = @This();

pipe: std.net.Stream,
allocator: std.mem.Allocator,

pub fn open(allocator: std.mem.Allocator, client_id: []const u8) !Self {
    var path_iterator = try LinuxPath.init();
    var ipc: Self = undefined;
    while (try path_iterator.next()) |path| {
        if (std.net.connectUnixSocket(path)) |stream| {
            ipc = .{ .pipe = stream, .allocator = allocator };
            break;
        } else |err| {
            std.log.warn("Unable to open {s}: {?}", .{ path, err });
        }
    } else return error.PipeUnavailable;
    errdefer ipc.close();
    try ipc.handshake(client_id);
    return ipc;
}

pub fn close(self: Self) void {
    self.pipe.close();
}

fn handshake(self: Self, client_id: []const u8) !void {
    const data = try std.json.stringifyAlloc(self.allocator, .{ .v = 1, .client_id = client_id }, .{});
    try self.writeMessage(0, data);
    defer self.allocator.free(data);

    const HandshakeResponse = struct {
        code: ?usize = null,
        message: []const u8 = "<no message>",
    };

    const response_data = try self.readMessage();
    std.log.debug("Handshake response: {s}", .{response_data});
    const response = try std.json.parseFromSlice(
        HandshakeResponse,
        self.allocator,
        response_data,
        .{ .ignore_unknown_fields = true },
    );
    defer response.deinit();

    if (response.value.code) |code| {
        std.log.err("Handshake error: {s} ({d})", .{ response.value.message, code });
        return error.FailedHandshake;
    }
}

pub fn writeActivityMessage(self: Self, payload: []const u8) !void {
    const pid = switch (builtin.os.tag) {
        .linux => std.os.linux.getpid(),
        .windows => std.os.windows.GetCurrentProcessId(),
        else => std.c.getpid(),
    };
    const timestamp = @as(u64, @bitCast(std.time.milliTimestamp()));
    const nonce = std.fmt.hex(timestamp);

    var buffer = std.ArrayList(u8).init(self.allocator);
    defer buffer.deinit();
    var writer = std.json.writeStream(buffer.writer().any(), .{});

    try writer.beginObject();
    {
        try writer.objectField("cmd");
        try writer.write("SET_ACTIVITY");
        try writer.objectField("nonce");
        try writer.write(nonce);
        try writer.objectField("args");
        try writer.beginObject();
        {
            try writer.objectField("pid");
            try writer.write(pid);
            try writer.objectField("activity");
            try writer.beginWriteRaw();
            try writer.stream.writeAll(payload);
            writer.endWriteRaw();
        }
        try writer.endObject();
    }
    try writer.endObject();
    try self.writeMessage(1, buffer.items);

    const response_data = try self.readMessage();
    defer self.allocator.free(response_data);
    std.log.debug("Discord: {s}", .{response_data});
}

fn writeMessage(self: Self, opcode: u32, data: []const u8) !void {
    const writer = self.pipe.writer();
    try writer.writeInt(u32, opcode, native_endian);
    try writer.writeInt(u32, @intCast(data.len), native_endian);
    try writer.writeAll(data);
}

fn readMessage(self: Self) ![]u8 {
    const reader = self.pipe.reader();
    _ = try reader.readInt(u32, native_endian);
    const size = try reader.readInt(u32, native_endian);
    if (size > MAX_RECV)
        return error.MessageTooLarge;
    const buffer = try self.allocator.alloc(u8, size);
    errdefer self.allocator.free(buffer);
    var n: usize = 0;
    while (n < size) {
        n += try reader.read(buffer[n..size]);
    }

    return buffer;
}

// Implementation for listing all possible IPC paths on Linux.
pub const LinuxPath = struct {
    path_buffer: [std.fs.max_path_bytes]u8,
    temp_dir_len: usize,
    index: usize,

    fn init() !LinuxPath {
        var iterator = LinuxPath{
            .path_buffer = undefined,
            .temp_dir_len = 0,
            .index = 0,
        };
        iterator.temp_dir_len = try LinuxPath.tempDir(&iterator.path_buffer);
        return iterator;
    }

    const ipc_dirs = [_][]const u8{
        ".",
        "snap.discord",
        "app/com.discordapp.Discord",
        "app/com.discordapp.DiscordCanary",
    };

    fn next(self: *LinuxPath) !?[]const u8 {
        if (self.index == ipc_dirs.len * 10)
            return null;

        const subdir_index = self.index / 10;
        const socket_index = self.index % 10;
        const subpath = try std.fmt.bufPrint(
            self.path_buffer[self.temp_dir_len..],
            "/{s}/discord-ipc-{d}",
            .{ ipc_dirs[subdir_index], socket_index },
        );

        self.index += 1;
        return self.path_buffer[0 .. self.temp_dir_len + subpath.len];
    }

    fn tempDir(buffer: []u8) !usize {
        var fba = std.heap.FixedBufferAllocator.init(buffer);
        const allocator = fba.allocator();
        if (std.process.getEnvVarOwned(allocator, "XDG_RUNTIME_DIR")) |v| {
            return v.len;
        } else |err| {
            if (err != error.EnvironmentVariableNotFound)
                return err;
        }
        const uid = std.os.linux.getuid();
        const slice = try std.fmt.allocPrint(allocator, "/run/user/{d}", .{uid});
        return slice.len;
    }
};
