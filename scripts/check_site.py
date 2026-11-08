#!/usr/bin/env python3
"""Static checks for the color bay: links, landmarks, and a few safety rules."""

from html.parser import HTMLParser
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
PAGES = [
    ROOT / "index.html",
    ROOT / "404.html",
    ROOT / "journal" / "index.html",
    ROOT / "journal" / "color-is-a-timing-decision.html",
    ROOT / "journal" / "the-gate-between-film-and-code.html",
    ROOT / "journal" / "signals-in-a-frame.html",
]


class Page(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.h1 = 0
        self.ids = []
        self.hrefs = []
        self.srcs = []
        self.imgs = []
        self.buttons = []
        self.inline_handlers = []
        self.has_main = False
        self.has_skip = False
        self.has_csp = False
        self.has_lang = False
        self.title = ""
        self._capture = None
        self._buffer = []

    def handle_starttag(self, tag, attrs):
        attr = dict(attrs)
        if tag == "html" and attr.get("lang"):
            self.has_lang = True
        if tag == "h1":
            self.h1 += 1
        if tag == "main":
            self.has_main = True
        if attr.get("id"):
            self.ids.append(attr["id"])
        if tag == "a":
            href = attr.get("href", "")
            self.hrefs.append(href)
            if href == "#content":
                self.has_skip = True
            if attr.get("target") == "_blank" and "noopener" not in attr.get("rel", ""):
                self.inline_handlers.append("target=_blank without noopener")
        if tag in {"img", "script", "link", "source"} and attr.get("src"):
            self.srcs.append(attr["src"])
        if tag == "link" and attr.get("href"):
            self.hrefs.append(attr["href"])
        if tag == "img":
            self.imgs.append(attr)
        if tag == "button":
            self.buttons.append(attr)
        if tag == "meta" and "Content-Security-Policy" in attr.get("http-equiv", ""):
            policy = attr.get("content", "")
            self.has_csp = "script-src 'self'" in policy and "object-src 'none'" in policy
        for name in attr:
            if name.startswith("on"):
                self.inline_handlers.append(name)
        if tag in {"title", "script"} and tag == "title":
            self._capture = "title"
            self._buffer = []

    def handle_endtag(self, tag):
        if tag == "title" and self._capture == "title":
            self.title = "".join(self._buffer).strip()
            self._capture = None

    def handle_data(self, data):
        if self._capture == "title":
            self._buffer.append(data)


def local_target(url):
    if not url or url.startswith(("http://", "https://", "mailto:", "data:")):
        return None
    path = url.split("#", 1)[0]
    if not path:
        return None
    if path.startswith("/"):
        return ROOT / path.lstrip("/")
    return None


def main():
    errors = []
    for page in PAGES:
        parser = Page()
        parser.feed(page.read_text(encoding="utf-8"))
        label = str(page.relative_to(ROOT))
        if not parser.has_lang:
            errors.append(f"{label}: missing lang")
        if parser.h1 != 1:
            errors.append(f"{label}: expected 1 h1, found {parser.h1}")
        if not parser.has_main or not parser.has_skip:
            errors.append(f"{label}: missing main or skip link")
        if not parser.has_csp:
            errors.append(f"{label}: missing strict CSP")
        if not parser.title:
            errors.append(f"{label}: missing title")
        if parser.inline_handlers:
            errors.append(f"{label}: inline handlers {parser.inline_handlers}")
        for img in parser.imgs:
            if "alt" not in img:
                errors.append(f"{label}: img missing alt {img.get('src')}")
        for href in parser.hrefs + parser.srcs:
            target = local_target(href)
            if target is None:
                continue
            if href.split("#", 1)[0].endswith("/"):
                target = target / "index.html"
            if not target.exists():
                errors.append(f"{label}: missing {href}")
        if "content" not in parser.ids:
            errors.append(f"{label}: missing #content")

    index = (ROOT / "index.html").read_text(encoding="utf-8")
    for anchor in ["reel", "bay", "studies", "bench", "journal", "slate", "lightbox"]:
        if f'id="{anchor}"' not in index:
            errors.append(f"index missing #{anchor}")
    js = (ROOT / "js" / "bay.js").read_text(encoding="utf-8")
    if "innerHTML" in js or "eval(" in js or "document.write" in js:
        errors.append("js uses an unsafe HTML sink")
    if 'var MAIL_TO = "";' not in js:
        errors.append("MAIL_TO should stay empty until a real inbox is set")

    if errors:
        print("\n".join(errors))
        return 1
    print(f"ok {len(PAGES)} pages")
    return 0


if __name__ == "__main__":
    sys.exit(main())
