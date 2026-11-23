#!/usr/bin/env python3
"""PayReso social renderer: calendar.json entry -> 1080x1350 JPEGs (+ PDF for carousels).

Usage:
  python3 tools/render.py <date YYYY-MM-DD> --bg <background image> [--calendar tools/calendar.json] [--out posts]

Text markup: wrap words in [square brackets] to colour them cyan (accent).
Slide kinds: static, cover, point, cta.
"""
import argparse, base64, html, json, re, sys
from pathlib import Path
from PIL import Image

HERE = Path(__file__).resolve().parent
FONTS = HERE / "fonts"
W, H = 1080, 1350


def b64(path):
    return base64.b64encode(Path(path).read_bytes()).decode()


def fmt(text):
    t = html.escape(text or "")
    return re.sub(r"\[(.+?)\]", r'<span class="acc">\1</span>', t).replace("\n", "<br>")


def css():
    faces = ""
    for fam, f, wt in [("Poppins", "Poppins-Bold.ttf", 700), ("Inter", "Inter-Regular.otf", 400),
                       ("Inter", "Inter-Medium.otf", 500), ("Inter", "Inter-SemiBold.otf", 600)]:
        mime = "font/ttf" if f.endswith("ttf") else "font/otf"
        faces += f"@font-face{{font-family:'{fam}';font-weight:{wt};src:url(data:{mime};base64,{b64(FONTS / f)})}}\n"
    return faces + """
*{margin:0;padding:0;box-sizing:border-box}
body{width:1080px;height:1350px;overflow:hidden;background:#071c3b;font-family:Inter,sans-serif;color:#fff}
.s{position:relative;width:1080px;height:1350px;overflow:hidden;background:#071c3b}
.dots-bg{position:absolute;inset:0;background-image:radial-gradient(rgba(255,255,255,.06) 1.5px,transparent 1.5px);background-size:52px 52px}
.glow{position:absolute;right:-260px;top:-260px;width:900px;height:900px;border-radius:50%;background:radial-gradient(circle,rgba(10,90,220,.75),rgba(7,28,59,0) 65%)}
.photo{position:absolute;inset:0;background-size:cover;background-position:center}
.shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(7,28,59,.35) 0%,rgba(7,28,59,.45) 35%,rgba(7,28,59,.92) 58%,#071c3b 72%)}
.content{position:absolute;left:86px;right:86px;bottom:250px}
.tag{display:inline-block;border:2px solid #13c7ea;border-radius:40px;padding:10px 22px;color:#13c7ea;font-family:Poppins;font-weight:700;font-size:24px;letter-spacing:5px;text-transform:uppercase;margin-bottom:28px;background:rgba(7,28,59,.55)}
h1{font-family:Poppins;font-weight:700;font-size:84px;line-height:1.07;letter-spacing:-1.5px}
h1.sm{font-size:72px}
.acc{color:#13c7ea}
.sub{margin-top:26px;font-size:34px;line-height:1.4;color:#dbe6f7}
.sub.link{color:#13c7ea;font-weight:600;font-size:30px}
.logo{position:absolute;left:88px;bottom:62px;width:92px}
.url{position:absolute;right:86px;bottom:84px;font-size:30px;font-weight:600;color:#fff}
.pager{position:absolute;right:86px;bottom:100px;display:flex;gap:12px;align-items:center}
.pager i{display:block;width:14px;height:14px;border-radius:7px;background:#45536d}
.pager i.on{width:40px;background:#13c7ea}
.bar{position:absolute;left:0;right:0;bottom:0;height:10px;background:linear-gradient(90deg,#066af9,#13c7ea)}
.num{position:absolute;left:86px;top:250px;font-family:Poppins;font-weight:700;font-size:210px;line-height:1;background:linear-gradient(90deg,#0a6ef5,#1a8cf5);-webkit-background-clip:text;color:transparent}
.pt{position:absolute;left:86px;right:86px;top:480px}
.pt h2{font-family:Poppins;font-weight:700;font-size:66px;line-height:1.12;letter-spacing:-1px}
.pt p{margin-top:30px;font-size:38px;line-height:1.5;color:#c9d6ec}
.cta{background:linear-gradient(160deg,#0a6af9 0%,#0647b8 40%,#071c3b 85%)}
.cta .inner{position:absolute;left:90px;right:90px;top:0;bottom:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}
.cta img{width:300px;margin-bottom:50px}
.cta h2{font-family:Poppins;font-weight:700;font-size:70px;line-height:1.12;letter-spacing:-1px}
.cta p{margin-top:30px;font-size:34px;line-height:1.45;color:#dbe6f7}
.btn{margin-top:56px;background:#13c7ea;color:#071c3b;font-weight:700;font-size:36px;padding:24px 48px;border-radius:50px}
"""


def pager(i, n):
    return '<div class="pager">' + "".join(f'<i class="{"on" if k == i else ""}"></i>' for k in range(n)) + "</div>"


def slide_html(sl, idx, n, bg_uri, logo_uri):
    kind = sl["kind"]
    logo = f'<img class="logo" src="{logo_uri}">'
    if kind in ("static", "cover"):
        size = "sm" if len(re.sub(r"[\[\]]", "", sl["headline"])) > 60 else ""
        sub_cls = "sub link" if kind == "cover" else "sub"
        sub = f'<div class="{sub_cls}">{fmt(sl.get("sub", ""))}</div>' if sl.get("sub") else ""
        foot = pager(idx, n) if kind == "cover" else '<div class="url">payresoai.com</div>'
        return (f'<div class="s"><div class="photo" style="background-image:url({bg_uri})"></div><div class="shade"></div>'
                f'<div class="content"><div class="tag">{html.escape(sl.get("tag", ""))}</div>'
                f'<h1 class="{size}">{fmt(sl["headline"])}</h1>{sub}</div>{logo}{foot}<div class="bar"></div></div>')
    if kind == "point":
        return (f'<div class="s"><div class="dots-bg"></div><div class="glow"></div>'
                f'<div class="num">{html.escape(sl["num"])}</div>'
                f'<div class="pt"><h2>{fmt(sl["title"])}</h2><p>{fmt(sl["body"])}</p></div>'
                f'{logo}{pager(idx, n)}<div class="bar"></div></div>')
    if kind == "cta":
        return (f'<div class="s cta"><div class="dots-bg"></div><div class="inner"><img src="{logo_uri}">'
                f'<h2>{fmt(sl["headline"])}</h2><p>{fmt(sl.get("body", ""))}</p>'
                f'<div class="btn">{html.escape(sl.get("button", "payresoai.com"))}</div></div><div class="bar"></div></div>')
    raise ValueError(f"unknown slide kind {kind}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("date")
    ap.add_argument("--bg", required=True)
    ap.add_argument("--calendar", default=str(HERE / "calendar.json"))
    ap.add_argument("--out", default=str(HERE.parent / "posts"))
    a = ap.parse_args()

    cal = json.loads(Path(a.calendar).read_text())
    post = next((p for p in cal["posts"] if p["date"] == a.date), None)
    if not post:
        sys.exit(f"no calendar entry for {a.date}")
    slides = post["slides"]
    n = len(slides)
    bg = Image.open(a.bg).convert("RGB")
    tmp = Path(a.out) / f".bg_{a.date}.jpg"
    Path(a.out).mkdir(parents=True, exist_ok=True)
    bg.save(tmp, quality=90)
    bg_uri = "data:image/jpeg;base64," + b64(tmp)
    tmp.unlink()
    logo_uri = "data:image/png;base64," + b64(HERE / "logo.png")
    style = css()
    kind = "carousel" if post["type"] == "carousel" else "static"

    from playwright.sync_api import sync_playwright
    outs = []
    with sync_playwright() as p:
        br = p.chromium.launch()
        pg = br.new_page(viewport={"width": W, "height": H}, device_scale_factor=1)
        for i, sl in enumerate(slides):
            pg.set_content(f"<html><head><style>{style}</style></head><body>{slide_html(sl, i, n, bg_uri, logo_uri)}</body></html>")
            pg.evaluate("document.fonts.ready")
            pg.wait_for_timeout(150)
            png = Path(a.out) / f".tmp_{i}.png"
            pg.screenshot(path=str(png))
            jpg = Path(a.out) / f"{a.date}_{kind}_{i + 1:02d}.jpg"
            Image.open(png).convert("RGB").save(jpg, quality=92)
            png.unlink()
            outs.append(jpg)
        br.close()
    if kind == "carousel":
        ims = [Image.open(o).convert("RGB") for o in outs]
        pdf = Path(a.out) / f"{a.date}_carousel.pdf"
        ims[0].save(pdf, save_all=True, append_images=ims[1:])
        outs.append(pdf)
    for o in outs:
        print(o)


if __name__ == "__main__":
    main()
