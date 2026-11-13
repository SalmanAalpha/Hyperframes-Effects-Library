#!/bin/bash
# Usage: export_kit.sh [dest]   (default ~/Desktop/Video Creation)
# Builds a portable copy of the video machine that mirrors this project's layout, so the
# recreate-reel skill runs unchanged on another computer. Re-run after any skill change.
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"; P="$(cd "$HERE/../../../.." && pwd)"
D="${1:-$HOME/Desktop/Video Creation}"
mkdir -p "$D"
C() { mkdir -p "$D/$(dirname "$1")"; cp -c -R "$P/$1" "$D/$(dirname "$1")/" 2>/dev/null || cp -R "$P/$1" "$D/$(dirname "$1")/"; }

# skills (the ones this pipeline uses)
rm -rf "$D/.claude/skills"; mkdir -p "$D/.claude/skills"
for s in recreate-reel video-script finished; do rsync -a --exclude 'renders/work-*' "$P/.claude/skills/$s" "$D/.claude/skills/"; done
# copy + rules
C research/limitless-black-card/BLACK-CARD-COPY-2026-10-29.md
C research/limitless-black-card/SHORT-CUTS-30s-60s-2026-10-30.md
[ -d "$P/research/filming-sop" ] && C research/filming-sop
# look, fonts, engines
rm -rf "$D/motion/site-stills-2026-11-02"; C motion/site-stills-2026-11-02
C motion/quran-dots-study/lib; C motion/quran-dots-study/aalpha.html; C motion/quran-dots-study/assets/fonts
# ffmpeg (macOS arm64 build)
[ -d "$D/motion/ffmpeg-bin" ] || C motion/ffmpeg-bin
# clip catalog + every clip file it lists, at the same paths
C research/pipeline/catalog/clips.json; C research/pipeline/catalog/build_catalog.py; C research/pipeline/catalog/index.html
python3 - "$P" "$D" <<'PY'
import json, os, shutil, subprocess, sys
P, D = sys.argv[1], sys.argv[2]
d = json.load(open(os.path.join(P, "research/pipeline/catalog/clips.json")))
clips = d.get("clips", d) if isinstance(d, dict) else d
items = clips.values() if isinstance(clips, dict) else clips
n = miss = 0
for e in items:
    p = isinstance(e, dict) and (e.get("path") or e.get("file"))
    if not p: continue
    src, dst = os.path.join(P, p), os.path.join(D, p)
    if not os.path.exists(src): miss += 1; continue
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    if not os.path.exists(dst):
        if subprocess.call(["cp", "-c", src, dst], stderr=subprocess.DEVNULL): shutil.copy2(src, dst)
    n += 1
print(f"clips: {n} copied, {miss} listed but not on disk")
PY
# worked examples: the AAL-14 ads (no source frames)
rsync -a --exclude 'frames/' --exclude 'src-frames/' --exclude '_src/' --exclude 'node_modules/' --exclude 'work-*' "$P/motion/inspo-recreate" "$D/motion/"
# remembered rules (Claude's memory files), loaded by the kit CLAUDE.md
M="$HOME/.claude/projects/-Users-salmanvahora-Documents-Work-Claude-Aalpha/memory"; mkdir -p "$D/rules"
for m in black-card-copy-source rotate-proof-not-108 latest-site-design agent-side-focus no-burned-captions dashboard-clips-native-light no-revenue-grows-line chrome-cpu-rules higgsfield-spend-gate; do [ -f "$M/$m.md" ] && cp "$M/$m.md" "$D/rules/"; done
# kit CLAUDE.md = project CLAUDE.md (claims list, naming, voice) + kit header + rule imports
{
  cat "$HERE/../kit/CLAUDE-header.md"
  echo; for f in "$D"/rules/*.md; do echo "@rules/$(basename "$f")"; done; echo
  echo "---"; echo; echo "# Project rules (copied from the Aalpha project CLAUDE.md, $(date +%F))"; echo
  grep -v '^@STATUS.md' "$P/CLAUDE.md"
} > "$D/CLAUDE.md"
cp "$HERE/../kit/SETUP.md" "$HERE/../kit/HOW-IT-WORKS.html" "$D/"
mv "$D/HOW-IT-WORKS.html" "$D/00 HOW IT WORKS.html"
echo "$(date '+%F %H:%M') exported from $P" > "$D/KIT-VERSION.txt"
du -sh "$D"
