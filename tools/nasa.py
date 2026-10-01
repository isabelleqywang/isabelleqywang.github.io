"""Fetch NASA imagery for the site.

1. Builds tools/picker.html: a self-contained image picker for NASA Images API results.
2. Downloads the NASA SVS CGI Moon Kit color + elevation maps into assets/moon/.
3. If tools/picks.txt lists NASA IDs, downloads those images and writes responsive WebP
   versions plus assets/img/credits.json.
"""
import base64
import concurrent.futures as cf
import html
import io
import json
import re
import sys
from pathlib import Path

import requests
from PIL import Image

Image.MAX_IMAGE_PIXELS = None
ROOT = Path(__file__).resolve().parent.parent
API = "https://images-api.nasa.gov"
KEYWORDS = ["moon surface", "lunar south pole", "earthrise", "Apollo moon",
            "Webb nebula", "Hubble galaxy", "Milky Way", "deep field"]
S = requests.Session()
S.headers["User-Agent"] = "portfolio-image-fetch/1.0"


def get(url, **kw):
    r = S.get(url, timeout=120, **kw)
    r.raise_for_status()
    return r


# ---------- metadata ----------
CREDIT_KEYS = ["XMP:Credit", "Photoshop:Credit", "IPTC:Credit", "XMP:Rights", "EXIF:Copyright",
               "IPTC:CopyrightNotice", "XMP:Creator", "IPTC:By-line", "EXIF:Artist", "XMP:UsageTerms"]


def metadata(nasa_id):
    try:
        loc = get(f"{API}/metadata/{nasa_id}").json()["location"]
        m = get(loc).json()
    except Exception:
        return {}
    w = next((m[k] for k in ("File:ImageWidth", "EXIF:ExifImageWidth", "EXIF:ImageWidth", "Composite:ImageSize") if k in m), None)
    h = next((m[k] for k in ("File:ImageHeight", "EXIF:ExifImageHeight", "EXIF:ImageHeight") if k in m), None)
    if isinstance(w, str) and "x" in w:
        w, h = w.split("x")[:2]
    credits = {k: str(m[k]) for k in CREDIT_KEYS if m.get(k)}
    return {"w": w, "h": h, "credits": credits}


def rights_status(item, meta):
    """'nasa' unless something names a third-party owner."""
    creds = meta.get("credits", {})
    text = " ".join([item.get("description", ""), *creds.values()])
    low = text.lower()
    if "©" in text or "all rights reserved" in low or any(w in low for w in ("getty", "ap photo", "reuters", "used with permission")):
        return "third-party"
    ok_words = ("nasa", "unlimited", "public", "for copyright and restrictions")
    owner_fields = [v for k, v in creds.items() if any(t in k for t in ("Credit", "Rights", "Copyright", "By-line"))]
    if owner_fields and not any(w in v.lower() for v in owner_fields for w in ok_words):
        return "third-party"
    return "nasa"


def thumb_b64(url):
    try:
        im = Image.open(io.BytesIO(get(url).content)).convert("RGB")
        im.thumbnail((360, 360))
        buf = io.BytesIO()
        im.save(buf, "JPEG", quality=72)
        return base64.b64encode(buf.getvalue()).decode()
    except Exception:
        return ""


def search(q):
    data = get(f"{API}/search", params={"q": q, "media_type": "image", "page_size": 30}).json()
    out = []
    for it in data["collection"]["items"][:30]:
        d = it["data"][0]
        out.append({
            "id": d["nasa_id"], "title": d.get("title", ""), "date": d.get("date_created", "")[:10],
            "center": d.get("center", ""), "photographer": d.get("photographer", ""),
            "secondary_creator": d.get("secondary_creator", ""),
            "description": re.sub(r"<[^>]+>", "", d.get("description", ""))[:600],
            "thumb": next((l["href"] for l in it.get("links", []) if l.get("render") == "image"), ""),
            "keyword": q,
        })
    return out


def build_picker():
    items, seen = [], set()
    for q in KEYWORDS:
        try:
            res = search(q)
        except Exception as e:
            print("search failed", q, e)
            continue
        for it in res:
            if it["id"] not in seen:
                seen.add(it["id"])
                items.append(it)
        print(f"{q}: {len(res)} results")

    def enrich(it):
        meta = metadata(it["id"])
        it["w"], it["h"] = meta.get("w"), meta.get("h")
        it["credits"] = meta.get("credits", {})
        it["rights"] = rights_status(it, meta)
        it["img"] = thumb_b64(it["thumb"]) if it["thumb"] else ""
        return it

    with cf.ThreadPoolExecutor(12) as ex:
        items = list(ex.map(enrich, items))

    cards = {}
    for it in items:
        bad = it["rights"] != "nasa"
        credit = "; ".join(f"{k.split(':')[-1]}: {v}" for k, v in it["credits"].items()) or "—"
        res = f'{it["w"]}×{it["h"]}' if it["w"] else "unknown"
        cards.setdefault(it["keyword"], []).append(f"""
<label class="card{' bad' if bad else ''}">
  <img loading="lazy" src="data:image/jpeg;base64,{it['img']}" alt="">
  <div class="meta">
    <div class="row"><input type="checkbox" value="{html.escape(it['id'])}" {'disabled' if bad else ''}>
      <b>{html.escape(it['title'])}</b></div>
    <div>{it['date']} · {html.escape(it['center'])} · <span class="mono">{res}</span></div>
    <div class="mono id">{html.escape(it['id'])}</div>
    <div class="credit">Credit/rights: {html.escape(credit)}</div>
    {'<div class="warn">⚠ Possibly not NASA copyright — do not use</div>' if bad else ''}
    <details><summary>description</summary>{html.escape(it['description'])}</details>
  </div>
</label>""")
    sections = "".join(f'<h2>{html.escape(k)} <small>({len(v)})</small></h2><div class="grid">{"".join(v)}</div>'
                       for k, v in cards.items())
    page = f"""<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>NASA Image Picker</title>
<style>
body{{background:#05070f;color:#dde3f0;font:14px/1.45 system-ui,sans-serif;margin:0;padding:16px 16px 140px}}
h1{{font-weight:300}} h2{{font-weight:400;margin:36px 0 12px;border-bottom:1px solid #223;padding-bottom:6px}}
small{{color:#778}} .mono{{font-family:ui-monospace,monospace;font-size:12px}}
.grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px}}
.card{{background:#0d1328;border:1px solid #1d2747;border-radius:10px;overflow:hidden;cursor:pointer;display:block}}
.card:has(input:checked){{outline:2px solid #7fb2ff}}
.card img{{width:100%;aspect-ratio:4/3;object-fit:cover;background:#000;display:block}}
.meta{{padding:10px;display:grid;gap:4px}} .row{{display:flex;gap:8px;align-items:flex-start}}
.id{{color:#8aa}} .credit{{color:#99a;font-size:12px;word-break:break-word}}
.bad{{opacity:.55;cursor:not-allowed}} .warn{{color:#ff7b7b;font-weight:600}}
details{{color:#99a;font-size:12px}}
.bar{{position:fixed;left:0;right:0;bottom:0;background:#0b1230ee;border-top:1px solid #2a3560;padding:12px 16px;display:flex;gap:10px;align-items:center;flex-wrap:wrap}}
textarea{{flex:1;min-width:200px;height:48px;background:#05070f;color:#dde3f0;border:1px solid #2a3560;border-radius:6px}}
button{{background:#7fb2ff;color:#05070f;border:0;border-radius:6px;padding:10px 14px;font-weight:600;cursor:pointer}}
</style></head><body>
<h1>NASA Image Picker</h1>
<p>Tick the images you like, then press <b>Export</b> and paste the ID list back. Red cards may be third-party copyright and are disabled.</p>
{sections}
<div class="bar"><span id="n">0 selected</span><button id="ex">Export</button><button id="dl">Download .txt</button>
<textarea id="out" readonly placeholder="Selected NASA IDs appear here"></textarea></div>
<script>
const ids=()=>[...document.querySelectorAll('input:checked')].map(i=>i.value);
document.addEventListener('change',()=>document.getElementById('n').textContent=ids().length+' selected');
document.getElementById('ex').onclick=()=>{{const t=ids().join('\\n');const o=document.getElementById('out');o.value=t;o.select();try{{navigator.clipboard.writeText(t)}}catch(e){{}}}};
document.getElementById('dl').onclick=()=>{{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([ids().join('\\n')],{{type:'text/plain'}}));a.download='picks.txt';a.click()}};
</script></body></html>"""
    (ROOT / "tools" / "picker.html").write_text(page)
    print(f"picker: {len(items)} unique images, {sum(i['rights'] != 'nasa' for i in items)} flagged")


# ---------- image processing ----------
def save_webp(im, path, width, max_kb=None, quality=82):
    im = im.copy()
    if im.width > width:
        im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    while True:
        buf = io.BytesIO()
        im.save(buf, "WEBP", quality=quality, method=6)
        if not max_kb or buf.tell() <= max_kb * 1024 or quality <= 40:
            break
        quality -= 6
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(buf.getvalue())
    print(f"  {path.relative_to(ROOT)} {im.width}x{im.height} {buf.tell() // 1024}KB q{quality}")


def moon_kit():
    out = ROOT / "assets" / "moon"
    if (out / "moon-color-4k.webp").exists():
        return
    page_url = "https://svs.gsfc.nasa.gov/4720"
    page = get(page_url).text
    links = sorted(set(re.findall(r'href="([^"]+\.(?:tif|jpg|png))"', page)))
    links = [l if l.startswith("http") else requests.compat.urljoin(page_url, l) for l in links]
    print("moon kit files:", *links, sep="\n  ")

    def pick(*patterns):
        for p in patterns:
            for l in links:
                if re.search(p, l.rsplit("/", 1)[-1]):
                    return l
        return None

    color = pick(r"lroc_color_poles_4k\.tif", r"lroc_color_poles_8k\.tif", r"lroc_color_poles_2k\.tif", r"lroc_color_poles.*\.jpg")
    elev = pick(r"ldem_3_8bit\.jpg", r"ldem_4\.tif", r"ldem_3.*", r"ldem.*\.jpg")
    print("using:", color, elev)
    im = Image.open(io.BytesIO(get(color).content)).convert("RGB")
    save_webp(im, out / "moon-color-4k.webp", 4096, quality=85)
    save_webp(im, out / "moon-color-2k.webp", 2048, quality=82)
    e = Image.open(io.BytesIO(get(elev).content))
    if e.mode not in ("L", "RGB"):
        e = e.point(lambda v: v * (1 / 256)).convert("L") if e.mode.startswith("I") else e.convert("L")
    e = e.convert("L")
    save_webp(e, out / "moon-elev-2k.webp", 2048, quality=88)
    save_webp(e, out / "moon-elev-1k.webp", 1024, quality=85)
    (out / "SOURCE.txt").write_text(f"NASA's Scientific Visualization Studio — CGI Moon Kit\n{page_url}\ncolor: {color}\nelevation: {elev}\n")


def fetch_picks():
    picks_file = ROOT / "tools" / "picks.txt"
    if not picks_file.exists():
        return
    ids = [l.strip() for l in picks_file.read_text().splitlines() if l.strip()]
    if not ids:
        return
    out = ROOT / "assets" / "img"
    credits_path = out / "credits.json"
    credits = json.loads(credits_path.read_text()) if credits_path.exists() else {}
    for nid in ids:
        if nid in credits:
            continue
        try:
            hrefs = [i["href"] for i in get(f"{API}/asset/{nid}").json()["collection"]["items"]]
            d = get(f"{API}/search", params={"nasa_id": nid}).json()["collection"]["items"][0]["data"][0]
        except Exception as e:
            print("asset lookup failed", nid, e)
            continue
        src = next((h for h in hrefs if h.endswith("~orig.jpg")), None) \
            or next((h for h in hrefs if h.endswith("~large.jpg")), None) \
            or next((h for h in hrefs if re.search(r"\.(jpe?g|png|tiff?)$", h, re.I)), None)
        print(nid, "<-", src)
        im = Image.open(io.BytesIO(get(src.replace("http://", "https://")).content)).convert("RGB")
        slug = re.sub(r"[^a-z0-9]+", "-", nid.lower()).strip("-")
        for w, kb in ((1280, 260), (1920, 480), (2560, 800)):
            save_webp(im, out / f"{slug}-{w}.webp", w, max_kb=kb)
        credits[nid] = {"slug": slug, "title": d.get("title", ""), "center": d.get("center", ""),
                        "date": d.get("date_created", "")[:10],
                        "credit": d.get("secondary_creator") or d.get("photographer") or "NASA",
                        "url": f"https://images.nasa.gov/details/{nid}",
                        "w": im.width, "h": im.height}
    out.mkdir(parents=True, exist_ok=True)
    credits_path.write_text(json.dumps(credits, indent=2))


if __name__ == "__main__":
    steps = sys.argv[1:] or ["picker", "moon", "picks"]
    if "picker" in steps and not (ROOT / "tools" / "picker.html").exists():
        build_picker()
    if "moon" in steps:
        moon_kit()
    if "picks" in steps:
        fetch_picks()
