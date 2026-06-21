#!/usr/bin/env python3
"""Generate right-sized WebP logos from the masters in assets-src/.

Logos render in a 36px circle, so 108px (3x) is plenty. Re-run after adding
or replacing a master PNG: `python3 scripts/optimize-images.py`
"""
from pathlib import Path
from PIL import Image

SRC = Path("assets-src")
OUT = Path("public/assets")
SIZE = 108          # 3x the 36px display size
QUALITY = 82

OUT.mkdir(parents=True, exist_ok=True)
for png in sorted(SRC.glob("*.png")):
    img = Image.open(png).convert("RGB").resize((SIZE, SIZE), Image.LANCZOS)
    dest = OUT / (png.stem + ".webp")
    img.save(dest, "WEBP", quality=QUALITY, method=6)
    print(f"{png.name} -> {dest}  ({dest.stat().st_size} b)")
