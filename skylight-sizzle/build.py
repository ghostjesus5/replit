"""Bundle src/main.js with esbuild and inline it, the fonts, and the photos into index.html.

Placeholders: /*@FONTS*/ and /*@BUNDLE*/ in reel.html, @@IMG:<file>@@ anywhere in the bundle.
"""
import base64
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).parent


def main():
    out = ROOT / "build/bundle.js"
    out.parent.mkdir(exist_ok=True)
    subprocess.run([str(ROOT / "node_modules/.bin/esbuild"), str(ROOT / "src/main.js"), "--bundle", "--format=iife",
                    "--minify", "--legal-comments=none", f"--outfile={out}", "--log-level=warning"], check=True)
    js = out.read_text()
    js = re.sub(r"@@IMG:([\w.-]+)@@",
                lambda m: "data:image/jpeg;base64," + base64.b64encode((ROOT / "src/img" / m.group(1)).read_bytes()).decode(), js)
    html = (ROOT / "reel.html").read_text()
    html = html.replace("/*@FONTS*/", (ROOT / "src/fonts.css").read_text())
    html = html.replace("/*@BUNDLE*/", js.replace("</script", "<\\/script"))
    (ROOT / "index.html").write_text(html)
    print(f"index.html {len(html) / 1024:.0f} KB")


if __name__ == "__main__":
    main()
