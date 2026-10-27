#!/usr/bin/env bash
# Effects library builder. Renders a 5s draft preview of each pilot effect.
# Usage: ./build.sh            (all 60 pilot effects)
#        ./build.sh all        (every effect in the catalog, skips ones already rendered)
#        ./build.sh fx1 fx2    (only these)
# Local only: never uses cloud/lambda/cloudrun/publish.
set -u
cd "$(dirname "$0")"
export PATH="$PWD/../ffmpeg-bin/bin:$PATH"
HF="npx -y hyperframes@0.8.74"

PILOT="count-up number-wheel number-pop-in slot-machine-roll apple-money-count mk-progress-stat conic-progress-ring star-rating-fill
animated-bar-chart bar-chart-race decline-chart data-chart chart-story heatmap mk-line-graph comparison-split before-after-wipe
caption-pill-karaoke caption-kinetic-slam caption-highlight caption-emoji-pop caption-editorial-emphasis caption-weight-shift
headline-slam scramble-reveal typewriter per-word-rise marker-highlight strikethrough-replace inline-highlight kinetic-type-swap
slack-notification-ad notification-pileup notification-stack chat-thread ai-chat-reveal claude-exchange x-post reddit-post testimonial-proof-card social-proof-card trust-strip logo-wall
agent-cursor cursor-zoom-follow ui-focus-zoom browser-device-stage scroll-feed marker-checklist-card
push-in rack-focus whip-pan camera-shake parallax-zoom
hw-underline hw-callout-circle hw-arrow
camcorder-hud lt-kicker-name
cta-close"

EFFECTS="${*:-$PILOT}"
SKIP_DONE=0
if [ "$EFFECTS" = "all" ]; then
  EFFECTS=$($HF catalog --json | python3 -c 'import json,sys; print(" ".join(i["name"] for i in json.load(sys.stdin)))')
  SKIP_DONE=1
fi
mkdir -p work clips thumbs logs
[ -f RESULTS.csv ] || echo "effect,category,status,render_seconds,note" > RESULTS.csv

log() { # effect status secs note
  grep -v "^$1," RESULTS.csv > RESULTS.tmp; mv RESULTS.tmp RESULTS.csv
  echo "$1,,$2,$3,\"${4//\"/\'}\"" >> RESULTS.csv
  echo "[$(date +%H:%M:%S)] $1: $2 ${3}s $4"
}

for fx in $EFFECTS; do
  [ "$SKIP_DONE" = 1 ] && grep -q "^$fx," RESULTS.csv && continue
  dir="work/$fx"; L="logs/$fx.log"
  rm -rf "$dir" clips/*/"$fx.mp4" thumbs/*/"$fx.jpg"
  $HF init "$dir" --resolution=portrait --non-interactive >"$L" 2>&1 || { log "$fx" failed 0 "init failed"; continue; }
  json=$($HF add "$fx" --dir "$dir" --json --no-clipboard 2>>"$L")
  src=$(printf '%s' "$json" | python3 -c '
import json,sys,os
d=json.loads(sys.stdin.read()); root=sys.argv[1]
f=[p for p in d.get("written",[]) if p.endswith(".html") and "/compositions/" in p]
import re
sn=d.get("snippet","")
w=re.search(r"data-width=.(\d+)",sn); h=re.search(r"data-height=.(\d+)",sn)
print(os.path.relpath(f[0],root) if f else "", w.group(1) if w else 1920, h.group(1) if h else 1080)' "$PWD/$dir" 2>>"$L")
  read -r src fw fh <<< "$src"
  # Render each effect at its own shape so nothing is cropped: blocks declare
  # their size, components have none and are built for 16:9 (1920x1080).
  res=landscape; [ "$fh" -gt "$fw" ] && res=portrait; [ "$fh" = "$fw" ] && res=square
  testlayer=""; [ -f "test-content/$fx.html" ] && testlayer=$(cat "test-content/$fx.html")
  [ -n "$src" ] || { log "$fx" failed 0 "add failed or not in catalog"; continue; }
  # Composition id, ignoring ids that only appear inside HTML comments (usage examples)
  cid=$(python3 -c 'import re,sys; s=re.sub(r"<!--.*?-->","",open(sys.argv[1]).read(),flags=re.S); m=re.search(r"data-composition-id=\"([^\"]*)\"",s); print(m.group(1) if m else "")' "$dir/$src")
  python3 knobs.py "$fx" "$dir/$src" 2>>"$L"
  mode=""
  if [ -n "$cid" ] && ! grep -q '<template' "$dir/$src" && [ -z "$testlayer" ]; then
    # A complete scene (its own <html>, no <template>): render it as the page itself.
    # Mounting it inside a wrapper breaks its module scripts.
    mode="standalone; "
    if grep -qi '<html' "$dir/$src"; then
      # Drop the registry comment above <!doctype> (the checker rejects it), and
      # point relative paths at the scene's own folder when it lives in a subfolder
      sub=$(dirname "$src")
      python3 -c 'import re,sys; s=open(sys.argv[1]).read(); s=re.sub(r"^\s*<!--.*?-->\s*","",s,count=1,flags=re.S); b=sys.argv[2]
if b not in ("compositions",): s=re.sub(r"(<head[^>]*>)", r"\1<base href="+b+"/>", s, count=1)
open(sys.argv[3],"w").write(s)' "$dir/$src" "$sub" "$dir/index.html"
    else
      # Fragment scene (no <html>): wrap it in a minimal page
      { printf '<!doctype html>\n<html lang="en"><head><meta charset="UTF-8" />\n<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>\n<style>*{margin:0;padding:0;box-sizing:border-box}html,body{width:%spx;height:%spx;overflow:hidden;background:#0a0a0a}</style></head>\n<body>\n' "$fw" "$fh"; cat "$dir/$src"; printf '\n</body></html>\n'; } > "$dir/index.html"
    fi
  elif [ -z "$cid" ]; then
    # Bare snippet component: paste it plus the example markup from its header comment
    mode="snippet; "
    python3 snippet_page.py "$dir/$src" "$fx" > "$dir/index.html" 2>>"$L" || { log "$fx" failed 0 "snippet wiring failed"; continue; }
  else
  cat > "$dir/index.html" <<EOF
<!doctype html>
<html lang="en" data-resolution="$res">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=$fw, height=$fh" />
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
<style>*{margin:0;padding:0;box-sizing:border-box}html,body{width:${fw}px;height:${fh}px;overflow:hidden;background:#0a0a0a}</style></head>
<body>
<div id="root" data-composition-id="main" data-start="0" data-duration="5" data-width="$fw" data-height="$fh">
$testlayer
  <div id="fx" class="clip" data-composition-id="$cid" data-composition-src="$src" data-start="0" data-duration="5" data-track-index="0" data-width="$fw" data-height="$fh" style="position:absolute;inset:0;width:${fw}px;height:${fh}px"></div>
</div>
<script>window.__timelines = window.__timelines || {}; window.__timelines["main"] = gsap.timeline({ paused: true });</script>
</body></html>
EOF
  fi
  checknote="$mode"
  $HF check "$dir" >>"$L" 2>&1 || checknote="${mode}check flagged issues; "
  t0=$(date +%s)
  if ! $HF render "$dir" -q draft -o "clips/$fx.mp4" >>"$L" 2>&1 || [ ! -s "clips/$fx.mp4" ]; then
    log "$fx" failed $(( $(date +%s) - t0 )) "${checknote}render failed: $(grep -m1 -iE 'error|fail' "$L" | cut -c1-140)"; continue
  fi
  secs=$(( $(date +%s) - t0 ))
  ffmpeg -loglevel error -y -ss 2.5 -i "clips/$fx.mp4" -frames:v 1 "thumbs/$fx.jpg"
  # "empty" = the 2.5s frame is a flat colour
  maxy=$(ffmpeg -i "thumbs/$fx.jpg" -vf signalstats,metadata=print:key=lavfi.signalstats.YMAX -f null - 2>&1 | grep -o 'YMAX=[0-9]*' | cut -d= -f2)
  miny=$(ffmpeg -i "thumbs/$fx.jpg" -vf signalstats,metadata=print:key=lavfi.signalstats.YMIN -f null - 2>&1 | grep -o 'YMIN=[0-9]*' | cut -d= -f2)
  if [ -n "$maxy" ] && [ $(( maxy - miny )) -lt 12 ]; then
    log "$fx" empty "$secs" "${checknote}frame at 2.5s is blank"
  else
    log "$fx" ok "$secs" "${checknote% ; }"
  fi
  [ "$SKIP_DONE" = 1 ] && rm -rf "$dir"
done

# Clips flagged empty from the 2.5s frame alone get a 5-frame second look
python3 recheck_empty.py
# Sort into clips/<category>/ and thumbs/<category>/, then rebuild the gallery
python3 make_index.py
