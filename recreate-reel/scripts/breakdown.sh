#!/bin/bash
# Usage: breakdown.sh <reel.mp4> <out-folder>
# Frames every 0.5s + scene cuts, a source contact sheet, and a transcript (if the reel has speech).
set -e
ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"
export PATH="$ROOT/motion/ffmpeg-bin/bin:$PATH"
IN="$1"; OUT="$2"
[ -f "$IN" ] || { echo "no reel: $IN"; exit 1; }
mkdir -p "$OUT/src/frames"
ffprobe -v error -show_entries stream=width,height:format=duration -of default=nw=1 "$IN" > "$OUT/src/info.txt"
ffmpeg -v error -y -i "$IN" -vf "fps=2,scale=360:-1" "$OUT/src/frames/t%03d.jpg"
ffmpeg -v error -y -i "$IN" -vf "select='gt(scene,0.3)',scale=360:-1,showinfo" -vsync vfr "$OUT/src/frames/cut%03d.jpg" 2> "$OUT/src/cuts.log" || true
grep -o 'pts_time:[0-9.]*' "$OUT/src/cuts.log" | cut -d: -f2 > "$OUT/src/cut-times.txt" || true
# source sheet: 24 frames spread over the whole reel, whatever its length
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$IN")
R=$(python3 -c "print(24/float('$DUR'))")
ffmpeg -v error -y -i "$IN" -vf "fps=$R,scale=180:-1,tile=8x3" -frames:v 1 "$OUT/src/source-sheet.png"
# transcript via the watch skill's whisper (Groq key in ~/.config/watch/.env); silent reels just get an empty file
W=$(ls -d "$HOME"/.claude/plugins/cache/claude-video/watch/*/skills/watch/scripts 2>/dev/null | tail -1)
if ffprobe -v error -select_streams a -show_entries stream=index -of csv=p=0 "$IN" | grep -q . && [ -n "$W" ]; then
  python3 "$W/watch.py" "$IN" --out-dir "$OUT/src/watch" --max-frames 1 > "$OUT/src/watch.log" 2>&1 || true
  sed -n '/^## Transcript/,/^---/p' "$OUT/src/watch.log" > "$OUT/src/transcript.txt"
  if ! grep -q '^\[' "$OUT/src/transcript.txt" 2>/dev/null; then echo "(no transcript: see src/watch.log)" > "$OUT/src/transcript.txt"; echo "WARN: no transcript. Is a Groq key set up? (SETUP.md step 5). Frames and sheet are fine."; fi
  rm -rf "$OUT/src/watch"
else echo "(no audio track or watch skill missing)" > "$OUT/src/transcript.txt"; fi
echo "done: $OUT/src  (look at source-sheet.png, then write BEATS.md)"; cat "$OUT/src/info.txt"
