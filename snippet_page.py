"""Build a 5s index.html around a bare snippet component.

Snippets ship as markup + CSS + script, with their animation only written as a
"Timeline integration" note. This page:
  - centres the snippet on a light stage (their default text colour is ink),
  - adds example markup: test-content/<effect>.html if it exists, else the
    lines under "Markup:" in the snippet's header comment,
  - runs the timeline note on the main timeline at 0.5s.
Usage: python3 snippet_page.py <snippet.html> <effect>"""
import os, re, sys

path, fx = sys.argv[1], sys.argv[2]
src = open(path).read()

test = f"test-content/{fx}.html"
if os.path.exists(test):
    demo = open(test).read()
else:
    m = re.search(r"Markup:\s*\n(.*?)\n\s*\n", src, re.S)
    demo = "\n".join(l.strip() for l in m.group(1).splitlines()) if m else ""

m = re.search(r"Timeline integration[^\n]*\n(.*?)-->", src, re.S)
anim = m.group(1).replace("startTime", "0.5") if m else ""
anim = re.sub(r"^\s*1\.0, // start time in seconds", "0.5,", anim, flags=re.M)

body = re.sub(r"^\s*<!--.*?-->", "", src, count=1, flags=re.S)
body = re.sub(r"<!--\s*Timeline integration.*?-->", "", body, flags=re.S)

print(f"""<!doctype html>
<html lang="en" data-resolution="portrait">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=1080, height=1920" />
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
<style>*{{margin:0;padding:0;box-sizing:border-box}}html,body{{width:1080px;height:1920px;overflow:hidden;background:#f4f4f5}}
#stage{{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#18181b;text-align:center}}
#scale{{transform:scale(2);transform-origin:center}}</style></head>
<body>
<div id="root" data-composition-id="main" data-start="0" data-duration="5" data-width="1080" data-height="1920">
  <div id="stage" class="clip" data-start="0" data-duration="5" data-track-index="0"><div id="scale">
{demo}
{body}
  </div></div>
</div>
<script>
  // Fit: up to 2x, never wider than 960px or taller than 1700px
  (function () {{
    const el = document.getElementById("scale"), r = el.getBoundingClientRect();
    const k = Math.min(2, 960 / Math.max(r.width, 1), 1700 / Math.max(r.height, 1));
    el.style.transform = "scale(" + k + ")";
  }})();
  window.__timelines = window.__timelines || {{}};
  const tl = gsap.timeline({{ paused: true }});
{anim}
  window.__timelines["main"] = tl;
</script>
</body></html>""")
