# SEEDSED — make_icons.py (Own Your Words: a white checkmark on pine green)
# Purpose: draw the app icon (white speech bubble on blue) as PNGs with no image libraries.
# Boundaries: writes app/icons/*.png only.
import struct
import sys
import zlib
from pathlib import Path

BLUE = (15, 107, 92)
WHITE = (255, 255, 255)


def inside_round_rect(x, y, x0, y0, x1, y1, r):
    if x < x0 or x > x1 or y < y0 or y > y1:
        return False
    cx = min(max(x, x0 + r), x1 - r)
    cy = min(max(y, y0 + r), y1 - r)
    return (x - cx) ** 2 + (y - cy) ** 2 <= r * r


def inside_triangle(x, y, a, b, c):
    def side(p, q):
        return (x - q[0]) * (p[1] - q[1]) - (p[0] - q[0]) * (y - q[1])
    d1, d2, d3 = side(a, b), side(b, c), side(c, a)
    return not ((d1 < 0 or d2 < 0 or d3 < 0) and (d1 > 0 or d2 > 0 or d3 > 0))


def pixel(u, v, full_bleed, scale):
    # u, v in 0..1. `scale` shrinks the bubble toward the centre (maskable safe zone).
    if not full_bleed and not inside_round_rect(u, v, 0, 0, 1, 1, 0.22):
        return None
    bu, bv = 0.5 + (u - 0.5) / scale, 0.5 + (v - 0.5) / scale
    # A check mark: two thick strokes.
    def near(ax, ay, cx, cy, width=0.075):
        dx, dy = cx - ax, cy - ay
        k = max(0, min(1, ((bu - ax) * dx + (bv - ay) * dy) / (dx * dx + dy * dy)))
        return (bu - ax - k * dx) ** 2 + (bv - ay - k * dy) ** 2 <= width ** 2
    if near(0.27, 0.52, 0.44, 0.69) or near(0.44, 0.69, 0.75, 0.33):
        return WHITE
    return BLUE


def png(size, full_bleed=False, scale=1.0):
    rows = []
    ss = 3  # supersampling for smooth edges
    for y in range(size):
        row = bytearray([0])
        for x in range(size):
            acc = [0, 0, 0, 0]
            for sy in range(ss):
                for sx in range(ss):
                    c = pixel((x + (sx + 0.5) / ss) / size, (y + (sy + 0.5) / ss) / size, full_bleed, scale)
                    if c:
                        acc[0] += c[0]; acc[1] += c[1]; acc[2] += c[2]; acc[3] += 255
            n = ss * ss
            alpha = acc[3] // n
            if alpha:
                k = acc[3] / 255
                row += bytes([int(acc[0] / k), int(acc[1] / k), int(acc[2] / k), alpha])
            else:
                row += bytes([0, 0, 0, 0])
        rows.append(bytes(row))

    def chunk(tag, data):
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)) + \
        chunk(b"IDAT", zlib.compress(b"".join(rows), 9)) + chunk(b"IEND", b"")


if __name__ == "__main__":
    out = Path(sys.argv[1] if len(sys.argv) > 1 else "app/icons")
    out.mkdir(parents=True, exist_ok=True)
    (out / "icon-192.png").write_bytes(png(192))
    (out / "icon-512.png").write_bytes(png(512))
    (out / "icon-maskable-512.png").write_bytes(png(512, full_bleed=True, scale=0.8))
    (out / "apple-touch-icon.png").write_bytes(png(180, full_bleed=True))  # iOS rounds the corners itself
    print("icons written to", out)
