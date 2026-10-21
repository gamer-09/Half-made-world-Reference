#!/usr/bin/env python3
"""
Paint the Half-Made World as an inked atlas globe.

The map follows the canon: the Human Realm sits centre-left (Aldermere, the
Arubian Forest, the Academy on the outskirts of its capital), the Angel Realm
top-right (Aurelion, the Crystal Oceans), the Demon Realm bottom-right
(Vorath, the Umbrage Forest, the Obsidian Spires), and the Hidden Realm in
the middle of all three, an island-group of mist and rift-light. The Sunward
Road and the Thorn Road run from the Human Realm to its neighbours, a realm
gate stands on each border, and the Shattered Lands - the wasteland left by
the Sundering - lie between the Human and Demon realms.

Everything is drawn in the archive's own language: ink-dark sea, brass and
pale gold and ember for the realms, mist for the Hidden Realm, violet for the
rifts. No satellite photography, no Earth.

Outputs (equirectangular, seamless in longitude):
    world-day.jpg      the painted map
    world-normal.jpg   gentle relief, for the sun
    world-clouds.png   sparse ink-wash weather
    world-night.jpg    what glows on the dark side
    world-surface.png  roughness / metalness packing
"""
import os
import numpy as np
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.abspath(os.path.join(HERE, "..", "src", "assets", "planets"))

DAY_W, DAY_H = 1024, 512
SMALL_W, SMALL_H = 512, 256

# --- the palette, in the archive's colours ----------------------------------
SEA_DEEP = np.array([7, 11, 17], dtype=np.float32)
SEA = np.array([13, 19, 27], dtype=np.float32)
SEA_LINE = np.array([26, 37, 50], dtype=np.float32)
GRID = np.array([28, 40, 55], dtype=np.float32)
COAST_INK = np.array([4, 6, 10], dtype=np.float32)
COAST_RIM = np.array([150, 133, 99], dtype=np.float32)

HUMAN = np.array([184, 148, 95], dtype=np.float32)      # brass
HUMAN_DARK = np.array([122, 95, 52], dtype=np.float32)
HUMAN_FOREST = np.array([104, 116, 68], dtype=np.float32)
ANGEL = np.array([227, 211, 162], dtype=np.float32)      # pale gold
ANGEL_LIGHT = np.array([243, 235, 209], dtype=np.float32)
ANGEL_SEA = np.array([176, 216, 224], dtype=np.float32)  # the Crystal Oceans
DEMON = np.array([169, 74, 55], dtype=np.float32)       # ember
DEMON_DARK = np.array([92, 42, 34], dtype=np.float32)
DEMON_ROCK = np.array([38, 26, 24], dtype=np.float32)   # the Obsidian Spires
HIDDEN = np.array([109, 124, 143], dtype=np.float32)     # mist
HIDDEN_LIGHT = np.array([150, 164, 180], dtype=np.float32)
RIFT = np.array([176, 107, 214], dtype=np.float32)       # rifts

# --- where the realms sit on the map ----------------------------------------
# u is the map's longitude (0..1) and lat its latitude. The globe is turned so
# that the Hidden Realm, in the middle of the three, faces the viewer at first.
REALMS = {
    "human": {"u": 0.160, "lat": 6.0, "cap": 0.46},
    "angel": {"u": 0.360, "lat": 36.0, "cap": 0.34},
    "demon": {"u": 0.352, "lat": -32.0, "cap": 0.38},
    "hidden": {"u": 0.250, "lat": 0.0, "cap": 0.22},
}


# --- noise ------------------------------------------------------------------
def hash3(i, j, k, seed):
    n = (i * 374761393 + j * 668265263 + k * 2147483647 + seed * 1274126177) & 0xFFFFFFFF
    n = (n ^ (n >> 13)) * 1274126177 & 0xFFFFFFFF
    return ((n ^ (n >> 16)) & 0xFFFFFFFF) / 4294967295.0


def value_noise3(x, y, z, seed):
    i, j, k = np.floor(x), np.floor(y), np.floor(z)
    fx, fy, fz = x - i, y - j, z - k
    ux = fx * fx * (3 - 2 * fx)
    uy = fy * fy * (3 - 2 * fy)
    uz = fz * fz * (3 - 2 * fz)
    i, j, k = i.astype(np.int64), j.astype(np.int64), k.astype(np.int64)
    c000 = hash3(i, j, k, seed)
    c100 = hash3(i + 1, j, k, seed)
    c010 = hash3(i, j + 1, k, seed)
    c110 = hash3(i + 1, j + 1, k, seed)
    c001 = hash3(i, j, k + 1, seed)
    c101 = hash3(i + 1, j, k + 1, seed)
    c011 = hash3(i, j + 1, k + 1, seed)
    c111 = hash3(i + 1, j + 1, k + 1, seed)
    x00 = c000 + (c100 - c000) * ux
    x10 = c010 + (c110 - c010) * ux
    x01 = c001 + (c101 - c001) * ux
    x11 = c011 + (c111 - c011) * ux
    y0 = x00 + (x10 - x00) * uy
    y1 = x01 + (x11 - x01) * uy
    return y0 + (y1 - y0) * uz


def fbm3(x, y, z, octaves=5, seed=1, gain=0.5, lac=2.0):
    total = np.zeros_like(x)
    amp = 1.0
    norm = 0.0
    freq = 1.0
    for o in range(octaves):
        total = total + amp * value_noise3(x * freq, y * freq, z * freq, seed + o * 37)
        norm += amp
        amp *= gain
        freq *= lac
    return total / norm


def ridged3(x, y, z, octaves=4, seed=1):
    total = np.zeros_like(x)
    amp = 1.0
    norm = 0.0
    freq = 1.0
    for o in range(octaves):
        n = 1.0 - np.abs(value_noise3(x * freq, y * freq, z * freq, seed + o * 53) * 2 - 1)
        total = total + amp * n * n
        norm += amp
        amp *= 0.5
        freq *= 2.0
    return total / norm


def smoothstep(a, b, t):
    t = np.clip((t - a) / (b - a), 0.0, 1.0)
    return t * t * (3 - 2 * t)


# --- the globe's geometry ----------------------------------------------------
def grid(w, h):
    """Directions, u and latitude for every pixel, matching three.js."""
    u = (np.arange(w, dtype=np.float32) + 0.5) / w
    v = (np.arange(h, dtype=np.float32) + 0.5) / h
    uu, vv = np.meshgrid(u, v)
    lat = 90.0 - vv * 180.0
    theta = np.deg2rad(90.0 - lat)
    phi = uu * 2.0 * np.pi
    st = np.sin(theta)
    x = -np.cos(phi) * st
    y = np.cos(theta)
    z = np.sin(phi) * st
    return x, y, z, uu, lat


def dir_of(u, lat):
    theta = np.deg2rad(90.0 - lat)
    phi = u * 2.0 * np.pi
    st = np.sin(theta)
    return np.array([-np.cos(phi) * st, np.cos(theta), np.sin(phi) * st], dtype=np.float32)


# --- the land of each realm --------------------------------------------------
def realm_field(dx, dy, dz, realm, seed):
    """Coverage of a realm's land: 1 is solid ground, 0 is open water."""
    spec = REALMS[realm]
    centre = dir_of(spec["u"], spec["lat"])
    d = 1.0 - (dx * centre[0] + dy * centre[1] + dz * centre[2])

    scale = 3.4 if realm != "hidden" else 4.6
    shape = fbm3(dx * scale, dy * scale, dz * scale, octaves=5, seed=seed)
    warp = fbm3(dx * scale * 0.55 + 11.0, dy * scale * 0.55, dz * scale * 0.55, octaves=3, seed=seed + 9)
    shape = shape * 0.72 + warp * 0.28

    # The land thins out towards the edge of the realm's reach.
    reach = spec["cap"] * 0.5
    fall = np.clip(d / max(reach, 1e-6), 0.0, 1.6) ** 1.6
    return shape - 0.62 * fall, d


def build_maps(w, h):
    x, y, z, u, lat = grid(w, h)

    maps = {"x": x, "y": y, "z": z, "u": u, "lat": lat}
    maps["masks"] = {}
    maps["cov"] = {}
    maps["height"] = np.zeros((h, w), dtype=np.float32)

    for name, seed in (("human", 11), ("angel", 29), ("demon", 47), ("hidden", 71)):
        cov, d = realm_field(x, y, z, name, seed)
        maps["cov"][name] = cov
        maps["masks"][name] = cov > 0.0
        relief = fbm3(x * 6.0, y * 6.0, z * 6.0, octaves=5, seed=seed + 5)
        maps["height"] = np.where(cov > 0.0, relief * np.clip(cov, 0, 1), maps["height"])

    return maps


# --- the sea -----------------------------------------------------------------
def paint_sea(maps):
    h, w = maps["lat"].shape
    sea = np.zeros((h, w, 3), dtype=np.float32)
    sea[:] = SEA

    # Deeper water towards the poles and in the far reaches of the world.
    depth = fbm3(maps["x"] * 2.2, maps["y"] * 2.2, maps["z"] * 2.2, octaves=4, seed=3)
    sea = sea + (SEA_DEEP - SEA) * np.clip(1.0 - depth * 1.6, 0.0, 1.0)[..., None]

    # Engraved wave lines, the way an old map rules the water.
    lines = np.sin(maps["lat"] * np.deg2rad(9.0) + depth * 7.0)
    wave = smoothstep(0.82, 0.99, np.abs(lines))
    sea = sea + (SEA_LINE - sea) * (wave * 0.5)[..., None]

    # A faint graticule, every 30 degrees.
    gu = np.abs(((maps["u"] * 360.0) % 30.0) - 15.0)
    gl = np.abs((maps["lat"] % 15.0) - 7.5)
    grid_line = np.maximum(smoothstep(0.55, 0.05, gu), smoothstep(0.35, 0.05, gl))
    sea = sea + (GRID - sea) * (grid_line * 0.35)[..., None]

    return sea


# --- the land of each realm --------------------------------------------------
def paint_land(maps, sea):
    h, w = maps["lat"].shape
    out = sea.copy()
    x, y, z = maps["x"], maps["y"], maps["z"]

    for name, base, dark, light in (
        ("human", HUMAN, HUMAN_DARK, HUMAN),
        ("angel", ANGEL, ANGEL, ANGEL_LIGHT),
        ("demon", DEMON, DEMON_DARK, DEMON),
        ("hidden", HIDDEN, HIDDEN, HIDDEN_LIGHT),
    ):
        cov = maps["cov"][name]
        land = cov > 0.0
        if not land.any():
            continue

        biome = fbm3(x * 8.0, y * 8.0, z * 8.0, octaves=4, seed=hash_name(name) % 97)
        tone = base[None, None, :] + (light - base)[None, None, :] * (biome[..., None] - 0.5) * 1.4
        tone = tone + (dark - tone) * np.clip((0.45 - biome)[..., None] * 1.6, 0.0, 1.0)

        # The forest of the realm: a second, larger patch of its own colour.
        if name in ("human", "demon", "hidden"):
            forest_col = {"human": HUMAN_FOREST, "demon": DEMON_ROCK, "hidden": HIDDEN}[name]
            fmask = fbm3(x * 4.4 + 31.0, y * 4.4, z * 4.4, octaves=4, seed=hash_name(name) % 53)
            fmask = smoothstep(0.56, 0.68, fmask) * land
            tone = tone + (forest_col - tone) * fmask[..., None] * 0.85

        # Contour lines, the way relief is ruled on a map.
        height = maps["height"]
        contour = np.abs(((height * 9.0) % 1.0) - 0.5) * 2.0
        contour = smoothstep(0.12, 0.02, contour) * land
        tone = tone * (1.0 - 0.18 * contour[..., None])

        # Engraved hatching, leaning with the map.
        hatch = np.sin((maps["u"] * 210.0 + maps["lat"] * 130.0))
        hatch = smoothstep(0.55, 0.95, hatch) * land * 0.06
        tone = tone * (1.0 - hatch[..., None])

        # The land is lit by the sun on the globe, so bake in only a whisper of
        # relief here.
        shade = 0.9 + 0.2 * (height - 0.5)
        tone = tone * shade[..., None]

        # A rim of light just off the coast, then the ink of the coastline.
        rim = (cov < 0.0) & (cov > -0.035)
        out = out + (COAST_RIM - out) * (rim * 0.35)[..., None]
        ink = np.abs(cov) < 0.012
        out = out + (COAST_INK - out) * ink[..., None]

        out = np.where(land[..., None], tone, out)

    return out


def hash_name(name):
    h = 0
    for ch in name:
        h = (h * 131 + ord(ch)) & 0xFFFFFFFF
    return h


# --- the marks of the world --------------------------------------------------
def u_lat_to_px(u, lat, w, h):
    return u * w, (90.0 - lat) / 180.0 * h


def draw_marks(day_path, maps):
    """Roads, gates, capitals and places, drawn as map symbols."""
    big = Image.open(day_path).resize((DAY_W * 2, DAY_H * 2), Image.LANCZOS)
    draw = ImageDraw.Draw(big)
    W2, H2 = DAY_W * 2, DAY_H * 2

    def px(u, lat):
        x, y = u_lat_to_px(u, lat, W2, H2)
        return x, y

    human = REALMS["human"]
    angel = REALMS["angel"]
    demon = REALMS["demon"]
    hidden = REALMS["hidden"]

    def arc(a, b, steps=90):
        """A great-circle path between two map positions."""
        pa, pb = dir_of(a["u"], a["lat"]), dir_of(b["u"], b["lat"])
        omega = np.arccos(np.clip(float(np.dot(pa, pb)), -1.0, 1.0))
        if omega < 1e-4:
            return []
        pts = []
        for i in range(steps + 1):
            t = i / steps
            s = np.sin(omega) or 1e-6
            p = (np.sin((1 - t) * omega) / s) * pa + (np.sin(t * omega) / s) * pb
            n = np.linalg.norm(p)
            p = p / n
            lat = np.rad2deg(np.arcsin(np.clip(p[1], -1, 1)))
            u = (np.arctan2(p[2], -p[0]) / (2 * np.pi)) % 1.0
            pts.append((u, lat))
        return pts

    def dashed(points, colour, width, dash=14, gap=10):
        for i in range(len(points) - 1):
            (u0, l0), (u1, l1) = points[i], points[i + 1]
            x0, y0 = px(u0, l0)
            x1, y1 = px(u1, l1)
            seg = np.hypot(x1 - x0, y1 - y0)
            n = max(int(seg // (dash + gap)), 1)
            for k in range(n):
                t0 = (k * (dash + gap)) / seg
                t1 = min((k * (dash + gap) + dash) / seg, 1.0)
                draw.line(
                    [(x0 + (x1 - x0) * t0, y0 + (y1 - y0) * t0),
                     (x0 + (x1 - x0) * t1, y0 + (y1 - y0) * t1)],
                    fill=colour, width=width)

    def ring(u, lat, r, colour, width=3):
        x, y = px(u, lat)
        draw.ellipse([x - r, y - r, x + r, y + r], outline=colour, width=width)

    def star(u, lat, r, colour):
        x, y = px(u, lat)
        draw.polygon([(x, y - r), (x + r * 0.35, y), (x, y + r), (x - r * 0.35, y)], fill=colour)
        draw.polygon([(x - r, y), (x, y - r * 0.35), (x + r, y), (x, y + r * 0.35)], fill=colour)

    def speck(u, lat, r, colour, count=1):
        x, y = px(u, lat)
        for i in range(count):
            draw.ellipse([x - r, y - r, x + r, y + r], fill=colour)

    # The Sunward Road, from the Human Realm to the Angel Realm.
    dashed(arc(human, angel), (217, 194, 149), 5)
    # The Thorn Road, from the Human Realm to the Demon Realm.
    dashed(arc(human, demon), (201, 154, 122), 5)

    # A realm gate on each border.
    for a, b in ((human, angel), (human, demon)):
        mid = arc(a, b, 2)[1]
        ring(mid[0], mid[1], 16, (232, 217, 160), width=4)
        speck(mid[0], mid[1], 4, (232, 217, 160))

    # Capitals: Aldermere, Aurelion, Vorath.
    star(human["u"], human["lat"] + 2.5, 13, (240, 224, 184))
    star(angel["u"], angel["lat"] + 3.0, 13, (250, 244, 226))
    star(demon["u"], demon["lat"] - 2.5, 13, (232, 186, 166))

    # The Academy, on the outskirts of the Human capital, and the Common
    # Sundering Altar, between the realms.
    ring(human["u"] - 0.028, human["lat"] - 3.0, 9, (168, 182, 198), width=3)
    speck(human["u"] - 0.028, human["lat"] - 3.0, 3, (168, 182, 198))
    ring(0.205, 8.0, 9, (176, 107, 214), width=3)
    speck(0.205, 8.0, 3, (176, 107, 214))

    # The wandering portal, in the Umbrage Forest.
    x, y = px(demon["u"] - 0.030, demon["lat"] + 4.0)
    draw.ellipse([x - 10, y - 10, x + 10, y + 10], outline=(176, 107, 214), width=3)

    # The Obsidian Spires: a line of black peaks in the Demon Realm.
    for i in range(5):
        sx, sy = px(demon["u"] + 0.012 + i * 0.007, demon["lat"] + 1.0 - i * 0.9)
        draw.polygon([(sx, sy - 9), (sx + 6, sy + 5), (sx - 6, sy + 5)], fill=(26, 18, 20))

    # The Crystal Oceans: a pale sheet of water in the Angel Realm.
    cx, cy = px(angel["u"] - 0.030, angel["lat"] - 4.0)
    draw.ellipse([cx - 34, cy - 22, cx + 34, cy + 22], fill=(176, 216, 224))

    # The Shattered Lands: a stippled waste between the Human and Demon
    # realms, on the Demon side of the Thorn Road.
    pts = arc(human, demon, 60)
    for i in range(6, len(pts) - 4, 3):
        u, l = pts[i]
        for j in range(3):
            draw.ellipse([u * W2 - 3, (90 - l) / 180 * H2 - 3,
                          u * W2 + 3, (90 - l) / 180 * H2 + 3], fill=(52, 40, 38))

    big = big.resize((DAY_W, DAY_H), Image.LANCZOS)
    big.save(day_path, quality=92)
    return big


# --- the dark side -----------------------------------------------------------
def build_night(maps):
    h, w = maps["lat"].shape
    x, y, z = maps["x"], maps["y"], maps["z"]
    night = np.zeros((h, w, 3), dtype=np.float32)

    # The Demon Realm burns: lava veins through the rock.
    lava = ridged3(x * 7.0, y * 7.0, z * 7.0, octaves=4, seed=23)
    lava = smoothstep(0.80, 0.99, lava) * maps["masks"]["demon"]
    night += np.array([255, 96, 40])[None, None, :] * lava[..., None] * 0.9

    # The Hidden Realm runs with rift-light.
    rift = ridged3(x * 6.0 + 7.0, y * 6.0, z * 6.0, octaves=4, seed=37)
    rift = smoothstep(0.83, 1.0, rift) * maps["masks"]["hidden"]
    night += RIFT[None, None, :] * rift[..., None] * 1.25

    # The Angel Realm glitters, faintly and far apart.
    glint = fbm3(x * 26.0, y * 26.0, z * 26.0, octaves=3, seed=59)
    glint = smoothstep(0.74, 0.88, glint) * maps["masks"]["angel"]
    night += np.array([255, 246, 220])[None, None, :] * glint[..., None] * 0.5

    # The Human Realm is settled: warm lights along the roads.
    lights = fbm3(x * 22.0 + 3.0, y * 22.0, z * 22.0, octaves=3, seed=83)
    lights = smoothstep(0.72, 0.86, lights) * maps["masks"]["human"]
    night += np.array([255, 206, 138])[None, None, :] * lights[..., None] * 0.7

    return np.clip(night, 0, 255)


# --- relief ------------------------------------------------------------------
def build_normal(maps):
    h, w = maps["lat"].shape
    height = maps["height"]
    dx = (np.roll(height, -1, axis=1) - np.roll(height, 1, axis=1)) * 1.4
    dy = (np.roll(height, -1, axis=0) - np.roll(height, 1, axis=0)) * 1.4
    nz = np.ones_like(height)
    n = np.sqrt(dx * dx + dy * dy + nz * nz)
    nx = -dx / n
    ny = -dy / n
    nzz = nz / n
    out = np.stack([(nx * 0.5 + 0.5) * 255, (ny * 0.5 + 0.5) * 255, (nzz * 0.5 + 0.5) * 255], axis=2)
    return np.clip(out, 0, 255).astype(np.uint8)


# --- weather and surface -----------------------------------------------------
def build_clouds(maps):
    h, w = maps["lat"].shape
    x, y, z = maps["x"], maps["y"], maps["z"]
    n = fbm3(x * 2.6, y * 2.6, z * 2.6, octaves=5, seed=101)
    n2 = fbm3(x * 5.1 + 13.0, y * 5.1, z * 5.1, octaves=4, seed=131)
    wash = smoothstep(0.50, 0.78, n * 0.7 + n2 * 0.3)
    wash = wash * 0.42
    rgb = np.zeros((h, w, 4), dtype=np.uint8)
    rgb[..., 0] = 205
    rgb[..., 1] = 210
    rgb[..., 2] = 220
    rgb[..., 3] = np.clip(wash * 255, 0, 255).astype(np.uint8)
    return rgb


def build_surface(maps):
    h, w = maps["lat"].shape
    out = np.zeros((h, w, 4), dtype=np.uint8)
    land = np.zeros((h, w), dtype=bool)
    for name in REALMS:
        land |= maps["masks"][name]
    rough = np.where(land, 0.82, 0.32)
    metal = np.zeros((h, w), dtype=np.float32)
    out[..., 0] = 255
    out[..., 1] = (rough * 255).astype(np.uint8)
    out[..., 2] = (metal * 255).astype(np.uint8)
    out[..., 3] = 255
    return out


def main():
    os.makedirs(OUT, exist_ok=True)

    def step(label):
        print("  %-22s" % label, flush=True)

    print("painting the world ...", flush=True)
    step("laying out the realms")
    maps = build_maps(DAY_W, DAY_H)
    step("ruling the sea")
    sea = paint_sea(maps)
    step("inking the land")
    day = paint_land(maps, sea)

    # The grain of the paper, over everything.
    step("grain")
    grain = fbm3(maps["x"] * 90.0, maps["y"] * 90.0, maps["z"] * 90.0, octaves=3, seed=211)
    day = day * (0.93 + 0.14 * grain[..., None])

    # The far reaches of the world fall into shadow.
    edge = np.clip((np.abs(maps["lat"]) - 55.0) / 35.0, 0.0, 1.0)
    day = day * (1.0 - 0.45 * edge)[..., None]

    day = np.clip(day, 0, 255).astype(np.uint8)
    day_path = os.path.join(OUT, "world-day.jpg")
    step("writing the map")
    Image.fromarray(day).save(day_path, quality=95)
    step("marking the roads and gates")
    draw_marks(day_path, maps)

    step("lighting the dark side")
    small = build_maps(SMALL_W, SMALL_H)
    night = build_night(small)
    Image.fromarray(night.astype(np.uint8)).save(os.path.join(OUT, "world-night.jpg"), quality=92)

    step("raising the relief")
    normal = build_normal(maps)
    Image.fromarray(normal).save(os.path.join(OUT, "world-normal.jpg"), quality=92)

    step("drifting the weather")
    clouds = build_clouds(maps)
    Image.fromarray(clouds).save(os.path.join(OUT, "world-clouds.png"), optimize=True)

    step("finishing the surface")
    surface = build_surface(maps)
    Image.fromarray(surface).save(os.path.join(OUT, "world-surface.png"), optimize=True)

    for name in ("human", "angel", "demon", "hidden"):
        print("  %-13s %.3f" % (name, maps["masks"][name].mean()))
    for name in ("world-day.jpg", "world-night.jpg", "world-normal.jpg", "world-clouds.png", "world-surface.png"):
        print("  %-20s %.1f KB" % (name, os.path.getsize(os.path.join(OUT, name)) / 1024.0))


if __name__ == "__main__":
    main()
