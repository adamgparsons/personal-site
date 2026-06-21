#!/usr/bin/env python3
"""Download Geist + Geist Mono (latin) from Google Fonts and subset them to the
glyphs this site actually uses, writing woff2 files to public/fonts/.

Geist is a variable font, so one file per family covers all weights. Re-run if
the page gains characters outside the range below:
    python3 scripts/build-fonts.py
"""
import re
import urllib.request
from pathlib import Path
from fontTools import subset
from fontTools.ttLib import TTFont

CSS_URL = (
    "https://fonts.googleapis.com/css2"
    "?family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&display=swap"
)
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0 Safari/537.36"

# ASCII printable + © · — — everything the page uses, with headroom for edits.
UNICODES = list(range(0x20, 0x7F)) + [0x00A9, 0x00B7, 0x2014]

OUT = Path("public/fonts")
OUT.mkdir(parents=True, exist_ok=True)

req = urllib.request.Request(CSS_URL, headers={"User-Agent": UA})
css = urllib.request.urlopen(req).read().decode()

# One latin woff2 per family (variable file is identical across weights).
seen = {}
for subset_name, body in re.findall(r"/\* (\S+) \*/\s*@font-face \{([^}]*)\}", css):
    if subset_name != "latin":
        continue
    fam = re.search(r"font-family: '([^']+)'", body).group(1)
    if fam in seen:
        continue
    seen[fam] = re.search(r"src: url\((\S+)\)", body).group(1)

for fam, url in seen.items():
    slug = fam.lower().replace(" ", "-")
    src = OUT / f"{slug}.full.woff2"
    urllib.request.urlretrieve(url, src)

    options = subset.Options()
    options.flavor = "woff2"
    options.layout_features = ["*"]   # keep kerning etc.
    options.name_IDs = ["*"]
    options.recalc_bounds = True
    font = TTFont(src)
    ss = subset.Subsetter(options=options)
    ss.populate(unicodes=UNICODES)
    ss.subset(font)
    dest = OUT / f"{slug}.woff2"
    font.save(dest)
    src.unlink()
    print(f"{fam}: {dest}  ({dest.stat().st_size} b)")
