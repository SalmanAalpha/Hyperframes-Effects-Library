#!/bin/bash
# Usage: new_project.sh <folder>   copies the starter template + moves library into a new ad folder
set -e
SK="$(cd "$(dirname "$0")/.." && pwd)"; OUT="$1"
mkdir -p "$OUT"
[ -f "$OUT/index.html" ] && { echo "$OUT/index.html exists, not overwriting"; exit 1; }
rsync -a --exclude renders "$SK/template/" "$OUT/"
cp "$SK/moves/moves.js" "$SK/moves/moves.css" "$SK/moves/particles.js" "$OUT/"
mkdir -p "$OUT/renders"
printf 'src/frames/\nsrc/watch.log\nrenders/work-*/\nnode_modules/\n' > "$OUT/.gitignore"
echo "ready: $OUT (edit index.html; moves in moves.js, see moves/README.md)"
