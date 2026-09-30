"""Assemble index.html from src/reel.html, the embedded Roboto faces, and the logo geometry.

Placeholders in src/reel.html:
  /*@FONTS*/  the four Roboto @font-face rules (300/400/500/700) from the brand guide
  @@LV@@      vertical lockup, each part tagged so the reel can animate it
  @@LH@@      horizontal lockup, Color version
  @@LI@@      logomark only, painted with currentColor
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).parent
BLUE, GOLD = "#3e71b8", "#f6b328"


def colorize(inner, lp, ls):
    return inner.replace("fill:var(--lp)", f"fill:{lp}").replace("fill:var(--ls)", f"fill:{ls}")


def tag_vertical(inner):
    parts = re.findall(r"<(?:polygon|path)[^>]*/>", inner)
    out, a, b = [], 0, 0
    names = ["mk-stroke", "mk-leg", "mk-bar"]
    for i, el in enumerate(parts):
        if i < 3:
            cls = f'class="mk {names[i]}"'
        elif "--lp" in el:
            cls, a = f'class="la" data-i="{a}"', a + 1
        else:
            cls, b = f'class="lb" data-i="{b}"', b + 1
        out.append(el.replace("<polygon ", f"<polygon {cls} ").replace("<path ", f"<path {cls} "))
    return colorize("".join(out), BLUE, GOLD)


def main():
    logo = json.loads((ROOT / "src/logo.json").read_text())
    syms = logo["syms"]
    html = (ROOT / "src/reel.html").read_text()
    html = html.replace("/*@FONTS*/", (ROOT / "src/fonts.css").read_text())
    html = html.replace("@@LV@@", tag_vertical(syms["lv"]))
    html = html.replace("@@LH@@", colorize(syms["lh"], BLUE, GOLD))
    html = html.replace("@@LI@@", colorize(syms["li"], "currentColor", "currentColor"))
    (ROOT / "index.html").write_text(html)
    print(f"index.html {len(html) / 1024:.0f} KB")


if __name__ == "__main__":
    main()
