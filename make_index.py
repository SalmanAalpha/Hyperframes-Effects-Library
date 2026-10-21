"""Build index.html from RESULTS.csv, the brief's category table and the catalog.
Run: python3 make_index.py   (from motion/effects-library/)"""
import csv, html, json, re, subprocess

brief = open("BRIEF.md").read()
cats = {}
for row in re.findall(r"^\| ([^|]+?) \| (`.+?) \|$", brief, re.M):
    for fx in re.findall(r"`([^`]+)`", row[1]):
        cats.setdefault(fx, row[0].strip())

cat_json = subprocess.run(["npx", "-y", "hyperframes@0.8.74", "catalog", "--json"],
                          capture_output=True, text=True).stdout
catalog = json.loads(cat_json)
desc = {i["name"]: i.get("description", "") for i in catalog}

# Effects outside the brief's pilot table get a category from their catalog tags
# (first matching rule wins).
TAG_RULES = [
    ("Captions", {"captions", "caption-style"}),
    ("Charts", {"data", "chart", "charts"}),
    ("Chat + social proof", {"social", "chat", "testimonial"}),
    ("Product + screen", {"cursor", "mock-ui", "product-demo", "ui-props", "code", "developer"}),
    ("Camera", {"camera"}),
    ("Hand-drawn", {"handwritten"}),
    ("Founder footage", {"lower-third"}),
    ("Transitions", {"transition", "transition-primitive", "transitions-dev-port"}),
    ("Shaders + textures", {"webgpu", "webgpu-shader", "shader", "webgl", "texture"}),
    ("3D", {"3d"}),
    ("Image galleries", {"carousel", "gallery", "images"}),
    ("Backgrounds", {"background"}),
    ("Overlays", {"overlay"}),
    ("Headline text", {"typography", "text", "title-card", "reveal"}),
]
for i in catalog:
    if i["name"] not in cats:
        tags = set(i.get("tags", []))
        cats[i["name"]] = next((c for c, t in TAG_RULES if tags & t), "Other")

import os
slug = lambda c: re.sub(r"[^a-z0-9]+", "-", c.lower().replace("+", " ")).strip("-")
rows = list(csv.DictReader(open("RESULTS.csv")))
# Sort clips/thumbs into <dir>/<category>/<effect> and add a category column
for r in rows:
    r["category"] = slug(cats.get(r["effect"], "other"))
    for d, ext in (("clips", "mp4"), ("thumbs", "jpg")):
        flat, dest = f"{d}/{r['effect']}.{ext}", f"{d}/{r['category']}/{r['effect']}.{ext}"
        if os.path.exists(flat):
            os.makedirs(os.path.dirname(dest), exist_ok=True)
            os.replace(flat, dest)
with open("RESULTS.csv", "w", newline="") as f:
    w = csv.DictWriter(f, ["effect", "category", "status", "render_seconds", "note"])
    w.writeheader()
    w.writerows(rows)
order = list(cats)
rows.sort(key=lambda r: order.index(r["effect"]) if r["effect"] in order else 999)
cat_list = list(dict.fromkeys(cats[r["effect"]] for r in rows if r["effect"] in cats))

knobs = json.load(open("knobs.json")) if os.path.exists("knobs.json") else {}

# What to bring, by category (on top of each effect's own fields)
BRING = {
    "Numbers": "Which number to show. Use one from the verified claims list.",
    "Charts": "The real data points and labels.",
    "Captions": "The spoken line, or the voiceover clip to caption.",
    "Headline text": "The line to animate.",
    "Chat + social proof": "Who it is from and what it says. A headshot or logo if it shows one.",
    "Product + screen": "A 2x screenshot or screen recording of what to show.",
    "Camera": "A 9:16 clip to move (founder footage works).",
    "Hand-drawn": "What to circle, underline or point at, and the shot it sits on.",
    "Founder footage": "Founder clip, name and title.",
    "Close": "The CTA line, logo and URL.",
    "Image galleries": "The images, in order.",
    "Transitions": "The two shots to cut between.",
    "Backgrounds": "Brand colours, or leave as is.",
    "Overlays": "The footage it sits on.",
}


def make_it_yours(fx, cat):
    ask, pick, bring = [], [], []
    for k in knobs.get(fx, []):
        label = k.get("label") or k.get("id", "")
        t, role = k.get("type"), k.get("role")
        if t in ("image", "asset", "video", "audio"):
            bring.append(f"{label}: {k.get('description', '')}")
        elif k.get("options"):
            pick.append(f"{label}: {' / '.join(map(str, k['options']))}")
        elif role in ("content", None) and t in ("string", "number"):
            ask.append(f"{label}? (now: {k.get('default', '')})")
        elif t == "color":
            pick.append(f"{label}: any colour (now {k.get('default', '')})")
    if cat in BRING:
        bring.insert(0, BRING[cat])
    li = lambda xs: "".join(f"<li>{html.escape(x)}</li>" for x in xs)
    parts = []
    if ask: parts.append(f"<b>I'll ask you</b><ul>{li(ask[:12])}</ul>")
    if pick: parts.append(f"<b>You can pick</b><ul>{li(pick)}</ul>")
    if bring: parts.append(f"<b>Bring</b><ul>{li(bring)}</ul>")
    prompt = f"Use the {fx} effect in my video. Ask me: " + "; ".join(
        [a.split("? (")[0] for a in ask[:12]] + bring) + "."
    return (f'<details><summary>Make it yours</summary>{"".join(parts)}</details>'
            f'<button class="copy" data-prompt="{html.escape(prompt)}">Copy request</button>')


cards = []
for r in rows:
    fx, st = r["effect"], r["status"]
    c = cats.get(fx, "Other")
    media = (f'<video src="clips/{r["category"]}/{fx}.mp4" poster="thumbs/{r["category"]}/{fx}.jpg" autoplay muted loop playsinline preload="metadata"></video>'
             if st != "failed" else f'<div class="fail">Failed<br><small>{html.escape(r["note"])}</small></div>')
    badge = f'<span class="badge {st}">{st}</span>' if st != "ok" else ""
    if not cards or cards[-1][0] != c:
        cards.append((c, f'<h2 data-cat="{html.escape(c)}">{html.escape(c)}</h2>'))
    cards.append((c, f'''<figure data-cat="{html.escape(c)}">{media}
  <figcaption><code>{fx}</code>{badge}<span class="cat">{html.escape(c)}</span>
  <p>{html.escape(desc.get(fx, ""))}</p>{make_it_yours(fx, c)}</figcaption></figure>'''))

buttons = "".join(f'<button data-cat="{html.escape(c)}">{html.escape(c)}</button>' for c in cat_list)
ok = sum(r["status"] == "ok" for r in rows)

open("index.html", "w").write(f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Effects Library</title>
<style>
:root{{--ink:#090b0c;--paper:#f1ede4;--gold:#e0bd6c;--mute:#8b8a85;--card:#15181a}}
*{{box-sizing:border-box}}body{{margin:0;background:var(--ink);color:var(--paper);font:15px/1.45 Manrope,system-ui,sans-serif;padding:24px 16px}}
h1{{font-weight:600;letter-spacing:-.02em;margin:0 0 4px}}.sub{{color:var(--mute);margin:0 0 18px;font-size:13px}}
nav{{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:22px;position:sticky;top:0;background:var(--ink);padding:8px 0;z-index:2}}
button{{background:none;border:1px solid #333;color:var(--paper);border-radius:999px;padding:6px 14px;font:inherit;font-size:13px;cursor:pointer}}
button.on{{background:var(--gold);color:var(--ink);border-color:var(--gold)}}
main{{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:18px}}
h2{{grid-column:1/-1;margin:18px 0 0;font:500 12px "DM Mono",monospace;text-transform:uppercase;letter-spacing:.12em;color:var(--gold);border-top:1px solid #2a2a2a;padding-top:14px}}
figure{{margin:0;background:var(--card);border-radius:10px;overflow:hidden}}
video,.fail{{display:block;width:100%;aspect-ratio:9/16;background:#000;object-fit:contain}}
.fail{{display:flex;flex-direction:column;align-items:center;justify-content:center;color:#d77;padding:16px;text-align:center}}
.fail small{{color:var(--mute);font-size:11px;word-break:break-word}}
figcaption{{padding:10px 12px 14px}}code{{font:500 14px "DM Mono",ui-monospace,monospace;color:var(--gold)}}
.cat{{display:block;font:11px "DM Mono",ui-monospace,monospace;text-transform:uppercase;letter-spacing:.08em;color:var(--mute);margin-top:2px}}
.badge{{margin-left:8px;font-size:11px;padding:1px 7px;border-radius:999px;background:#333}}.badge.failed{{background:#5a2222}}.badge.empty{{background:#4a4020}}
details{{margin-top:10px;font-size:12.5px;color:#c9c5bc}}summary{{cursor:pointer;color:var(--gold);font-weight:600}}
details b{{display:block;margin-top:8px;color:var(--paper);font-size:11px;text-transform:uppercase;letter-spacing:.06em}}
details ul{{margin:4px 0 0;padding-left:16px}}details li{{margin:2px 0;word-break:break-word}}
button.copy{{margin-top:10px;font-size:12px;padding:5px 12px}}button.copy.done{{background:var(--sage,#9fb5a6);color:var(--ink);border-color:transparent}}
p{{margin:6px 0 0;font-size:12.5px;color:#c9c5bc;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden}}
</style></head><body>
<h1>Effects library</h1>
<p class="sub">{len(rows)} HyperFrames registry effects, 5s draft previews, defaults untouched. {ok} rendered clean. Name in gold = what to type.</p>
<nav><button class="on" data-cat="">All</button>{buttons}</nav>
<main>
{chr(10).join(x for _, x in cards)}
</main>
<script>
document.querySelectorAll("nav button").forEach(b=>b.onclick=()=>{{
  document.querySelectorAll("nav button").forEach(x=>x.classList.toggle("on",x===b));
  document.querySelectorAll("figure,h2").forEach(f=>f.style.display=!b.dataset.cat||f.dataset.cat===b.dataset.cat?"":"none");
}});
document.querySelectorAll("button.copy").forEach(b=>b.onclick=()=>{{
  navigator.clipboard.writeText(b.dataset.prompt).then(()=>{{b.textContent="Copied. Paste it to Claude";b.classList.add("done");
  setTimeout(()=>{{b.textContent="Copy request";b.classList.remove("done")}},2500)}});
}});
</script>
</body></html>
""")
print(f"index.html: {len(rows)} effects, {ok} ok")
