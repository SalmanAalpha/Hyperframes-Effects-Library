#!/usr/bin/env bash
# Effects library builder. Renders a 5s draft preview of each pilot effect.
# Usage: ./build.sh            (all 60 pilot effects)
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
mkdir -p work clips thumbs logs
[ -f RESULTS.csv ] || echo "effect,category,status,render_seconds,note" > RESULTS.csv

log() { # effect status secs note
  grep -v "^$1," RESULTS.csv > RESULTS.tmp; mv RESULTS.tmp RESULTS.csv
  echo "$1,,$2,$3,\"${4//\"/\'}\"" >> RESULTS.csv
  echo "[$(date +%H:%M:%S)] $1: $2 ${3}s $4"
}

for fx in $EFFECTS; do
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
print(os.path.relpath(f[0],root) if f else "", w.group(1) if w else 1080, h.group(1) if h else 1920)' "$PWD/$dir" 2>>"$L")
  read -r src fw fh <<< "$src"
  ftop=$(( (1920 - fh) / 2 )); fleft=$(( (1080 - fw) / 2 ))
  [ -n "$src" ] || { log "$fx" failed 0 "add failed or not in catalog"; continue; }
  cid=$(grep -o 'data-composition-id="[^"]*"' "$dir/$src" | head -1 | cut -d'"' -f2)
  mode=""
  if [ -z "$cid" ]; then
    # Bare snippet component: paste it plus the example markup from its header comment
    mode="snippet; "
    python3 snippet_page.py "$dir/$src" > "$dir/index.html" 2>>"$L" || { log "$fx" failed 0 "snippet wiring failed"; continue; }
  else
  cat > "$dir/index.html" <<EOF
<!doctype html>
<html lang="en" data-resolution="portrait">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=1080, height=1920" />
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
<style>*{margin:0;padding:0;box-sizing:border-box}html,body{width:1080px;height:1920px;overflow:hidden;background:#0a0a0a}</style></head>
<body>
<div id="root" data-composition-id="main" data-start="0" data-duration="5" data-width="1080" data-height="1920">
  <div id="fx" class="clip" data-composition-id="$cid" data-composition-src="$src" data-start="0" data-duration="5" data-track-index="0" data-width="$fw" data-height="$fh" style="position:absolute;left:${fleft}px;top:${ftop}px;width:${fw}px;height:${fh}px"></div>
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
done

# Sort into clips/<category>/ and thumbs/<category>/, then rebuild the gallery
python3 make_index.py
