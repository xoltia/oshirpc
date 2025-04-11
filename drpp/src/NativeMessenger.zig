const std = @import("std");
const builtin = @import("builtin");
const native_endian = builtin.cpu.arch.endian();

const File = std.fs.File;
const Self = @This();

stdin: File,
stdout: File,

pub fn init(stdin: File, stdout: File) Self {
    return .{ .stdin = stdin, .stdout = stdout };
}

pub fn write(self: Self, message: []const u8) !void {
    const writer = self.stdout.writer();
    try writer.writeInt(u32, message.len, native_endian);
    try writer.writeAll(message);
}

pub fn read(self: Self, allocator: std.mem.Allocator) ![]u8 {
    const reader = self.stdin.reader();
    const size = try reader.readInt(u32, native_endian);
    const buffer = try allocator.alloc(u8, size);
    errdefer allocator.free(buffer);
    var n: usize = 0;
    while (n < size) {
        n += try reader.read(buffer[n..size]);
    }
    return buffer;
}
