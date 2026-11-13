#!/bin/bash
# Usage: render.sh <project-folder> <out-name> [composition.html]
# Lint, wait for the shared lock (one render at a time on this Mac), render high, free the lock, make the sheet.
HERE="$(cd "$(dirname "$0")" && pwd)"; ROOT="$(cd "$HERE/../../../.." && pwd)"
export PATH="$ROOT/motion/ffmpeg-bin/bin:$PATH"
P="$1"; NAME="$2"; COMP="${3:-}"
cd "$P" || exit 1
npx hyperframes@0.8.74 lint . || { echo "lint failed, fix first"; exit 1; }
LOCK="$ROOT/motion/.render.lock"
until mkdir "$LOCK" 2>/dev/null; do echo "waiting for render lock..."; sleep 15; done
trap 'rmdir "$LOCK" 2>/dev/null' EXIT
mkdir -p renders
if [ -n "$COMP" ]; then npx hyperframes@0.8.74 render . -c "$COMP" -q high -o "./renders/$NAME.mp4"; else npx hyperframes@0.8.74 render . -q high -o "./renders/$NAME.mp4"; fi
rc=$?
rmdir "$LOCK" 2>/dev/null; trap - EXIT
[ $rc -eq 0 ] && bash "$HERE/sheet.sh" "./renders/$NAME.mp4"
exit $rc
