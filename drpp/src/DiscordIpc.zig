const std = @import("std");
const builtin = @import("builtin");
const native_endian = builtin.cpu.arch.endian();

const PathBuffer = [std.fs.max_path_bytes]u8;
const Self = @This();

pipe: std.fs.File,

pub fn open(client_id: []const u8) !Self {
    var buffer: PathBuffer = undefined;
    const len = try LinuxPaths.tempDir(&buffer);

    var path_iterator = LinuxPaths.init(buffer[0..len]);
    var ipc: Self = undefined;
    while (try path_iterator.next()) |path| {
        if (std.fs.openFileAbsolute(path, .{ .mode = .read_write })) |file| {
            ipc = .{ .pipe = file };
            break;
        } else |_| {}
    } else return error.Unavailable;

    try ipc.handshake(&buffer, client_id);
    return ipc;
}

fn handshake(self: Self, buffer: []u8, client_id: []const u8) !void {
    var fba = std.heap.FixedBufferAllocator.init(buffer);
    const allocator = fba.allocator();

    const data = try std.json.stringifyAlloc(allocator, .{ .v = 1, .client_id = client_id }, .{});
    try self.writeMessage(0, data);
    fba.reset();

    const HandshakeResponse = struct {
        code: ?usize,
        message: []const u8,
    };
    const response_size = try self.readMessage(buffer);
    const response_data = buffer[0..response_size];
    fba.end_index = response_size;
    const response = try std.json.parseFromSliceLeaky(HandshakeResponse, allocator, response_data, .{});
    if (response.code) |code| {
        std.log.err("handshake: {s} ({d})", .{ response.message, code });
        return error.FailedHandshake;
    }
}

pub fn writeActivityMessage(self: Self, payload: []const u8) !void {
    const pid = switch (builtin.os.tag) {
        .linux => std.os.linux.getpid(),
        .windows => std.os.windows.GetCurrentProcessId(),
        else => std.c.getpid(),
    };
    var buffer = try std.BoundedArray(u8, 4096).init(0);
    var writer = std.json.writeStream(buffer.writer().any(), .{});
    try writer.beginObject();
    {
        try writer.objectField("cmd");
        try writer.write("SET_ACTIVITY");
        try writer.objectField("args");
        try writer.beginObject();
        {
            try writer.objectField("pid");
            try writer.write(pid);
            try writer.objectField("activity");
            try writer.beginWriteRaw();
            try writer.write(payload);
            writer.endWriteRaw();
        }
        try writer.endObject();
    }
    try writer.endObject();
    try self.writeMessage(1, buffer.constSlice());
}

fn writeMessage(self: Self, opcode: u32, data: []const u8) !void {
    const writer = self.pipe.writer();
    try writer.writeInt(u32, opcode, native_endian);
    try writer.writeInt(u32, @intCast(data.len), native_endian);
    try writer.writeAll(data);
}

fn readMessage(self: Self, buffer: []u8) !usize {
    const reader = self.pipe.reader();
    const size = try reader.readInt(u32, native_endian);
    if (size > buffer.len)
        return error.MessageTooLarge;
    var n: usize = 0;
    while (n < size) {
        n += try reader.read(buffer[n..]);
    }
    return n;
}

pub const LinuxPaths = struct {
    path_buffer: PathBuffer,
    temp_dir_len: usize,
    index: usize,

    fn init(temp_dir: []const u8) LinuxPaths {
        var iterator = LinuxPaths{
            .path_buffer = undefined,
            .temp_dir_len = temp_dir.len,
            .index = 0,
        };
        @memcpy(iterator.path_buffer[0..temp_dir.len], temp_dir);
        return iterator;
    }

    const ipc_dirs = [_][]const u8{
        ".",
        "snap.discord",
        "app/com.discordapp.Discord",
        "app/com.discordapp.DiscordCanary",
    };

    fn next(self: *LinuxPaths) !?[]const u8 {
        if (self.index == ipc_dirs.len * 10)
            return null;

        const subdir_index = self.index / 10;
        const socket_index = self.index % 10;
        const subpath = try std.fmt.bufPrint(
            self.path_buffer[self.temp_dir_len..],
            "{s}/discord-ipc-{d}",
            .{ ipc_dirs[subdir_index], socket_index },
        );

        self.index += 1;
        return self.path_buffer[0 .. self.temp_dir_len + subpath.len];
    }

    fn tempDir(buffer: *PathBuffer) !usize {
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
