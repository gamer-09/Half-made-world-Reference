#!/usr/bin/env python3
"""Print an ASCII preview of the generated planet maps (for eyeballing)."""
import os
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.abspath(os.path.join(HERE, "..", "src", "assets", "planets"))

day = np.asarray(Image.open(os.path.join(OUT, "world-day.jpg")).convert("RGB"), dtype=np.float32) / 255.0
night = np.asarray(Image.open(os.path.join(OUT, "world-night.jpg")).convert("RGB"), dtype=np.float32) / 255.0
h, w, _ = day.shape

COLS, ROWS = 118, 34
ys = np.linspace(0, h - 1, ROWS).astype(int)
xs = np.linspace(0, w - 1, COLS).astype(int)
small = day[np.ix_(ys, xs)]
snight = night[np.ix_(ys, xs)]


def classify(px, np_):
    r, g, b = px
    if r + g + b > 0.22 and b > g > r:
        return "~"                      # ice / cloud
    if r > 0.45 and g > 0.35 and b < g:
        return "H" if r > 0.62 else "."  # human: brass / olive
    if r > 0.62 and g > 0.58:
        return "A"                      # angel: pale gold
    if r > 0.33 and r > g * 1.5:
        return "D"                      # demon: ember
    if b > g and b > 0.18:
        return "S"                      # hidden: ash / slate
    return " "                          # ocean


print("DAY  (H=human A=angel D=demon S=hidden ~=ice .=lowland  space=ocean)")
for row in range(ROWS):
    print("".join(classify(small[row, col], snight[row, col]) for col in range(COLS)))

print()
print("NIGHT EMISSIVE")
for row in range(ROWS):
    line = ""
    for col in range(COLS):
        r, g, b = snight[row, col]
        v = max(r, g, b)
        if v < 0.06:
            line += " "
        elif v < 0.25:
            line += "."
        elif v < 0.55:
            line += "+"
        else:
            line += "#"
    print(line)

print()
print("mean day colour: %s" % np.round(day.reshape(-1, 3).mean(axis=0), 3))
print("land fraction:   %.3f" % (1.0 - (day.max(axis=2) < 0.35).mean()))
print("emissive pixels: %.4f" % (night.max(axis=2) > 0.25).mean())
