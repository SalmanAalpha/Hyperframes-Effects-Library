"""Build a 5s index.html around a bare snippet component, using the example
markup from the snippet's own header comment (the lines under "Markup:")."""
import re, sys

src = open(sys.argv[1]).read()
m = re.search(r"Markup:\s*\n(.*?)\n\s*\n", src, re.S)
demo = "\n".join(l.strip() for l in m.group(1).splitlines()) if m else ""
body = re.sub(r"^\s*<!--.*?-->", "", src, count=1, flags=re.S)
print(f"""<!doctype html>
<html lang="en" data-resolution="portrait">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=1080, height=1920" />
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
<style>*{{margin:0;padding:0;box-sizing:border-box}}html,body{{width:1080px;height:1920px;overflow:hidden;background:#0a0a0a}}
#stage{{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#f4f4f5;font:600 120px Inter,system-ui,sans-serif;text-align:center;padding:80px}}</style></head>
<body>
<div id="root" data-composition-id="main" data-start="0" data-duration="5" data-width="1080" data-height="1920">
  <div id="stage" class="clip" data-start="0" data-duration="5" data-track-index="0">
{demo}
  </div>
</div>
<script>window.__timelines = window.__timelines || {{}}; window.__timelines["main"] = gsap.timeline({{ paused: true }});</script>
{body}
</body></html>""")
