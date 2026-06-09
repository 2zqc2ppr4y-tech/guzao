from __future__ import annotations

import math
import random
import struct
import zlib
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
ASSET_DIR = ROOT / "frontend" / "src" / "assets"
ASSET_DIR.mkdir(parents=True, exist_ok=True)


def clamp(value: float) -> int:
    return max(0, min(255, int(value)))


def blend(dst: tuple[int, int, int, int], src: tuple[int, int, int, int]) -> tuple[int, int, int, int]:
    sr, sg, sb, sa = src
    dr, dg, db, da = dst
    alpha = sa / 255
    out_a = sa + da * (1 - alpha)
    if out_a <= 0:
        return (0, 0, 0, 0)
    return (
        clamp((sr * alpha + dr * (da / 255) * (1 - alpha)) / (out_a / 255)),
        clamp((sg * alpha + dg * (da / 255) * (1 - alpha)) / (out_a / 255)),
        clamp((sb * alpha + db * (da / 255) * (1 - alpha)) / (out_a / 255)),
        clamp(out_a),
    )


def write_png(path: Path, pixels: list[list[tuple[int, int, int, int]]]) -> None:
    height = len(pixels)
    width = len(pixels[0])
    raw = bytearray()
    for row in pixels:
        raw.append(0)
        for r, g, b, a in row:
            raw.extend((r, g, b, a))

    def chunk(tag: bytes, data: bytes) -> bytes:
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(bytes(raw), 9))
    png += chunk(b"IEND", b"")
    path.write_bytes(png)


def canvas(width: int, height: int, top: tuple[int, int, int], bottom: tuple[int, int, int]) -> list[list[tuple[int, int, int, int]]]:
    pixels: list[list[tuple[int, int, int, int]]] = []
    for y in range(height):
        t = y / max(1, height - 1)
        row = []
        for x in range(width):
            glow = 34 * math.exp(-((x - width * 0.72) ** 2 + (y - height * 0.22) ** 2) / (2 * (width * 0.24) ** 2))
            r = top[0] * (1 - t) + bottom[0] * t + glow * 0.25
            g = top[1] * (1 - t) + bottom[1] * t + glow * 0.75
            b = top[2] * (1 - t) + bottom[2] * t + glow
            row.append((clamp(r), clamp(g), clamp(b), 255))
        pixels.append(row)
    return pixels


def put(pixels: list[list[tuple[int, int, int, int]]], x: int, y: int, color: tuple[int, int, int, int]) -> None:
    if 0 <= y < len(pixels) and 0 <= x < len(pixels[0]):
        pixels[y][x] = blend(pixels[y][x], color)


def ellipse(
    pixels: list[list[tuple[int, int, int, int]]],
    cx: float,
    cy: float,
    rx: float,
    ry: float,
    color: tuple[int, int, int, int],
    outline: tuple[int, int, int, int] | None = None,
) -> None:
    min_x, max_x = int(cx - rx - 2), int(cx + rx + 2)
    min_y, max_y = int(cy - ry - 2), int(cy + ry + 2)
    for y in range(min_y, max_y + 1):
        for x in range(min_x, max_x + 1):
            d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2
            if d <= 1:
                edge = max(0.0, min(1.0, (1 - d) * 5))
                alpha = clamp(color[3] * min(1, edge + 0.35))
                put(pixels, x, y, (color[0], color[1], color[2], alpha))
            elif outline and d <= 1.07:
                put(pixels, x, y, outline)


def circle(pixels: list[list[tuple[int, int, int, int]]], cx: float, cy: float, r: float, color: tuple[int, int, int, int]) -> None:
    ellipse(pixels, cx, cy, r, r, color)


def stroke_curve(
    pixels: list[list[tuple[int, int, int, int]]],
    points: list[tuple[float, float]],
    radius: float,
    color: tuple[int, int, int, int],
) -> None:
    for x, y in points:
        circle(pixels, x, y, radius, color)


def add_particles(pixels: list[list[tuple[int, int, int, int]]], count: int, seed: int) -> None:
    random.seed(seed)
    width = len(pixels[0])
    height = len(pixels)
    for _ in range(count):
        x = random.randrange(width)
        y = random.randrange(height)
        r = random.uniform(1.0, 3.2)
        color = random.choice([(87, 239, 218, 58), (112, 201, 255, 44), (255, 206, 125, 34)])
        circle(pixels, x, y, r, color)


def draw_cosmarium(pixels: list[list[tuple[int, int, int, int]]], cx: int, cy: int, scale: float) -> None:
    fill = (98, 238, 190, 184)
    outline = (214, 255, 239, 155)
    ellipse(pixels, cx - 45 * scale, cy, 62 * scale, 86 * scale, fill, outline)
    ellipse(pixels, cx + 45 * scale, cy, 62 * scale, 86 * scale, fill, outline)
    ellipse(pixels, cx, cy, 28 * scale, 52 * scale, (8, 43, 50, 162))
    for side in (-1, 1):
        ellipse(pixels, cx + side * 47 * scale, cy, 25 * scale, 48 * scale, (17, 119, 80, 92))
        for i in range(12):
            angle = (math.pi * 2 * i / 12) + 0.3
            dot_x = cx + side * 47 * scale + math.cos(angle) * 27 * scale
            dot_y = cy + math.sin(angle) * 42 * scale
            circle(pixels, dot_x, dot_y, 3.5 * scale, (226, 255, 178, 125))


def draw_closterium(pixels: list[list[tuple[int, int, int, int]]], cx: int, cy: int, scale: float) -> None:
    points = []
    for i in range(135):
        t = i / 134
        angle = math.radians(204 - 228 * t)
        x = cx + math.cos(angle) * 125 * scale
        y = cy + math.sin(angle) * 72 * scale
        points.append((x, y))
    stroke_curve(pixels, points, 16 * scale, (97, 240, 186, 162))
    stroke_curve(pixels, points, 8 * scale, (32, 126, 78, 102))
    for i in range(18):
        x, y = points[int(i * (len(points) - 1) / 17)]
        circle(pixels, x, y, 2.7 * scale, (232, 255, 186, 116))


def draw_micrasterias(pixels: list[list[tuple[int, int, int, int]]], cx: int, cy: int, scale: float) -> None:
    fill = (104, 237, 185, 168)
    outline = (221, 255, 236, 135)
    for i in range(12):
        angle = math.pi * 2 * i / 12
        ellipse(
            pixels,
            cx + math.cos(angle) * 58 * scale,
            cy + math.sin(angle) * 58 * scale,
            35 * scale,
            18 * scale,
            fill,
            outline,
        )
    ellipse(pixels, cx, cy, 62 * scale, 62 * scale, (85, 220, 165, 158), outline)
    ellipse(pixels, cx, cy, 20 * scale, 20 * scale, (17, 93, 68, 95))
    for i in range(24):
        angle = math.pi * 2 * i / 24
        circle(pixels, cx + math.cos(angle) * 46 * scale, cy + math.sin(angle) * 46 * scale, 3 * scale, (238, 255, 178, 98))


def make_hero() -> None:
    pixels = canvas(1400, 900, (4, 22, 43), (2, 88, 105))
    add_particles(pixels, 500, 10)
    draw_cosmarium(pixels, 910, 410, 2.3)
    draw_closterium(pixels, 1120, 620, 1.45)
    draw_micrasterias(pixels, 1030, 205, 1.2)
    draw_cosmarium(pixels, 1210, 190, 0.82)
    write_png(ASSET_DIR / "desmid-hero.png", pixels)


def make_reference(filename: str, drawer) -> None:
    pixels = canvas(760, 560, (5, 30, 49), (12, 94, 104))
    add_particles(pixels, 180, hash(filename) & 0xFFFF)
    drawer(pixels, 380, 280, 1.62)
    write_png(ASSET_DIR / filename, pixels)


def main() -> None:
    make_hero()
    make_reference("cosmarium-reference.png", draw_cosmarium)
    make_reference("closterium-reference.png", draw_closterium)
    make_reference("micrasterias-reference.png", draw_micrasterias)


if __name__ == "__main__":
    main()
