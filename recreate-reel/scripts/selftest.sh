#!/bin/bash
# Proves the kit works on this machine: tools present, copy checker, template render, sheet.
HERE="$(cd "$(dirname "$0")" && pwd)"; ROOT="$(cd "$HERE/../../../.." && pwd)"; cd "$ROOT"
export PATH="$ROOT/motion/ffmpeg-bin/bin:$PATH"
ok=1; say() { echo "$1"; }
command -v node >/dev/null && say "node: $(node --version)" || { say "MISSING node"; ok=0; }
command -v ffmpeg >/dev/null && say "ffmpeg: ok" || { say "MISSING ffmpeg"; ok=0; }
for f in research/limitless-black-card/BLACK-CARD-COPY-2026-10-29.md CLAUDE.md research/pipeline/catalog/clips.json motion/site-stills-2026-11-02/logo-headroom-2026-11.svg; do [ -f "$f" ] && say "file ok: $f" || { say "MISSING $f"; ok=0; }; done
ls -d "$HOME"/.claude/plugins/cache/*/hyperframes >/dev/null 2>&1 && say "hyperframes plugin: ok" || say "WARN hyperframes plugin not installed (renders still work; Claude loses the authoring guide)"
ls -d "$HOME"/.claude/plugins/cache/*/watch >/dev/null 2>&1 && say "watch plugin: ok" || say "WARN watch plugin not installed (no transcripts)"
T=$(mktemp -d); printf 'The bigger your marketing agency gets, the more inefficient it becomes.\n40+ hours a week back by day 90, or we work for free.\n' > "$T/l.txt"
python3 "$HERE/check_copy.py" "$T/l.txt" >/dev/null && say "copy checker: ok" || { say "FAIL copy checker"; ok=0; }
rm -rf motion/_selftest; bash "$HERE/new_project.sh" motion/_selftest >/dev/null && bash "$HERE/render.sh" motion/_selftest selftest >/dev/null 2>&1 && [ -f motion/_selftest/renders/selftest-sheet.png ] && say "render + sheet: ok (motion/_selftest/renders/)" || { say "FAIL render (run: bash $HERE/render.sh motion/_selftest selftest)"; ok=0; }
[ $ok = 1 ] && echo "SELFTEST PASSED" || { echo "SELFTEST FAILED"; exit 1; }
