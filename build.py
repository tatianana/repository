"""Собирает статический сайт вишлиста в папку dist/.

Использование:
    python build.py            # собрать сайт
    python build.py --serve    # собрать и запустить локальный сервер
"""

from __future__ import annotations

import argparse
import functools
import http.server
import json
import shutil
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape

ROOT = Path(__file__).parent
DATA_DIR = ROOT / "data"
TEMPLATES_DIR = ROOT / "templates"
STATIC_DIR = ROOT / "static"
DIST_DIR = ROOT / "dist"

REQUIRED_GIFT_FIELDS = ("id", "title", "description", "image")


def load_json(path: Path):
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def resolve_image(image: str) -> str:
    if image.startswith(("http://", "https://")):
        return image
    local = STATIC_DIR / "images" / image
    if not local.is_file():
        raise SystemExit(f"Картинка не найдена: {local.relative_to(ROOT)}")
    return f"images/{image}"


def load_gifts() -> list[dict]:
    gifts = load_json(DATA_DIR / "gifts.json")
    seen_ids: set[str] = set()
    for i, gift in enumerate(gifts, start=1):
        missing = [f for f in REQUIRED_GIFT_FIELDS if not gift.get(f)]
        if missing:
            raise SystemExit(f"Подарок №{i}: не заполнены поля {', '.join(missing)}")
        if gift["id"] in seen_ids:
            raise SystemExit(f"Повторяющийся id подарка: {gift['id']}")
        seen_ids.add(gift["id"])
        gift["image"] = resolve_image(gift["image"])
    return gifts


def build() -> None:
    site = load_json(DATA_DIR / "site.json")
    gifts = load_gifts()

    if DIST_DIR.exists():
        shutil.rmtree(DIST_DIR)
    shutil.copytree(STATIC_DIR, DIST_DIR)
    (DIST_DIR / ".nojekyll").touch()

    env = Environment(
        loader=FileSystemLoader(TEMPLATES_DIR),
        autoescape=select_autoescape(["html", "j2"]),
    )
    html = env.get_template("index.html.j2").render(
        site=site,
        gifts=gifts,
        client_config={
            "firebase": site.get("firebase", {}),
            "collection": site.get("bookings_collection", "bookings"),
        },
    )
    (DIST_DIR / "index.html").write_text(html, encoding="utf-8")
    print(f"Готово: подарков в списке — {len(gifts)}, сайт в {DIST_DIR.relative_to(ROOT)}/index.html")


def serve(port: int) -> None:
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=DIST_DIR)
    with http.server.ThreadingHTTPServer(("127.0.0.1", port), handler) as httpd:
        print(f"Открой http://127.0.0.1:{port}  (Ctrl+C — остановить)")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            pass


def main() -> None:
    parser = argparse.ArgumentParser(description="Сборка вишлиста")
    parser.add_argument("--serve", action="store_true", help="запустить локальный сервер после сборки")
    parser.add_argument("--port", type=int, default=8000)
    args = parser.parse_args()

    build()
    if args.serve:
        serve(args.port)


if __name__ == "__main__":
    main()
