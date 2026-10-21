#!/usr/bin/env python3
"""ASCII preview of the painted map, with the visible hemisphere marked."""
import os
import numpy as np
from PIL import Image

OUT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                   "..", "src", "assets", "planets"))
img = np.asarray(Image.open(os.path.join(OUT, "world-day.jpg")).convert("RGB"), dtype=np.float32) / 255.0
h, w, _ = img.shape
COLS, ROWS = 110, 34
ys = np.linspace(0, h - 1, ROWS).astype(int)
xs = np.linspace(0, w - 1, COLS).astype(int)
small = img[np.ix_(ys, xs)]


def classify(px):
    r, g, b = px
    v = max(r, g, b)
    if v < 0.12:
        return " "                       # ink sea
    if r > 0.30 and g > 0.26 and b < g * 0.92 and r > b * 1.5:
        return "H"                       # brass - Human Realm
    if r > 0.45 and g > 0.42 and b > 0.30 and r < b * 1.4:
        return "A"                       # pale gold - Angel Realm
    if r > 0.28 and g < r * 0.62:
        return "D"                       # ember - Demon Realm
    if b >= g >= r and v > 0.2:
        return "S"                       # mist - Hidden Realm
    if v > 0.55 and b > r:
        return "C"                       # crystal ocean
    return "."                           # other land


print("MAP  (H=human A=angel D=demon S=hidden C=crystal .=land .=sea)  | visible hemisphere is the left half")
for row in range(ROWS):
    line = "".join(classify(small[row, col]) for col in range(COLS))
    marker = "|" if row % 4 == 0 else " "
    print(line + marker)

print()
print("mean colour", np.round(img.reshape(-1, 3).mean(axis=0), 3))
for name, col in (("brass", (184, 148, 95)), ("gold", (227, 211, 162)),
                  ("ember", (169, 74, 55)), ("mist", (109, 124, 143))):
    d = np.linalg.norm(img - np.array(col) / 255.0, axis=2)
    print("  %-6s near %.3f" % (name, float((d < 0.16).mean())))
