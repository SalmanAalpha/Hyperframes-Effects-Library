#!/bin/bash
# Usage: sheet.sh <video.mp4> [tiles=12]   writes <video>-sheet.png, frames spread evenly
ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"
export PATH="$ROOT/motion/ffmpeg-bin/bin:$PATH"
V="$1"; N="${2:-12}"
D=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$V")
R=$(python3 -c "print(max(0.1, $N/$D))")
ffmpeg -v error -y -i "$V" -vf "fps=$R,scale=360:-1,tile=6x2" -frames:v 1 "${V%.mp4}-sheet.png"
echo "sheet: ${V%.mp4}-sheet.png (${D}s)"
