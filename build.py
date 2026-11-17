#!/usr/bin/env python3
"""Build the single-file map from src/.

    python3 build.py                 -> dist/flushing.html
    python3 build.py out/other.html  -> a different output path

src/index.html is the page shell. Each `<!-- @include path -->` in it is replaced by
the contents of src/path (paths are relative to src/). The output is one
self-contained HTML file, which the "offline copy" and "save map" buttons rely on.
"""
import hashlib
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "src"
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "dist" / "flushing.html"
MARK = re.compile(r"<!-- @include (\S+) -->")


def piece(m):
    path = SRC / m.group(1)
    if not path.is_file():
        sys.exit(f"build: missing include {m.group(1)}")
    text = path.read_text(encoding="utf-8")
    # Each piece file ends with a newline for editing comfort; the marker line supplies its own.
    return text[:-1] if text.endswith("\n") else text


shell = (SRC / "index.html").read_text(encoding="utf-8")
html = MARK.sub(piece, shell)  # one pass: markers inside included files are left alone

OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(html, encoding="utf-8")
size = OUT.stat().st_size
print(f"built {OUT.relative_to(ROOT) if OUT.is_relative_to(ROOT) else OUT}  "
      f"{size / 1e6:.1f} MB  md5 {hashlib.md5(OUT.read_bytes()).hexdigest()}")
