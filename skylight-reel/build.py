"""Assemble index.html from src/reel.html, the embedded Barlow faces, and the photography.

Placeholders in src/reel.html:
  /*@FONTS*/          Barlow and Barlow Condensed @font-face rules (latin subset, base64 woff2)
  @@IMG:<file>@@      data URI for src/img/<file>
"""
import base64
import re
from pathlib import Path

ROOT = Path(__file__).parent


def data_uri(name):
    raw = (ROOT / "src/img" / name).read_bytes()
    return "data:image/jpeg;base64," + base64.b64encode(raw).decode()


def main():
    html = (ROOT / "src/reel.html").read_text()
    html = html.replace("/*@FONTS*/", (ROOT / "src/fonts.css").read_text())
    html = re.sub(r"@@IMG:([\w.-]+)@@", lambda m: data_uri(m.group(1)), html)
    (ROOT / "index.html").write_text(html)
    print(f"index.html {len(html) / 1024:.0f} KB")


if __name__ == "__main__":
    main()
