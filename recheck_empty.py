"""Re-check clips marked "empty" by sampling 5 frames instead of one.
A clip is empty only if every sampled frame is a flat colour. For clips that
have content, the thumbnail is replaced with the busiest frame.
Usage: python3 recheck_empty.py [effect ...]   (default: every row marked empty)"""
import csv, glob, os, subprocess, sys

FF = os.path.join("..", "ffmpeg-bin", "bin", "ffmpeg")
TIMES = [0.5, 1.5, 2.5, 3.5, 4.5]


def spread(clip, t):
    """Luma range (max - min) of the frame at t seconds; 0 means flat."""
    out = subprocess.run([FF, "-ss", str(t), "-i", clip, "-frames:v", "1", "-vf",
                          "signalstats,metadata=print:key=lavfi.signalstats.YMAX,metadata=print:key=lavfi.signalstats.YMIN",
                          "-f", "null", "-"], capture_output=True, text=True).stderr
    vals = {}
    for line in out.splitlines():
        for k in ("YMAX", "YMIN"):
            if f"signalstats.{k}=" in line:
                vals[k] = int(float(line.split("=")[-1]))
    return vals.get("YMAX", 0) - vals.get("YMIN", 0)


rows = list(csv.DictReader(open("RESULTS.csv")))
want = set(sys.argv[1:]) or {r["effect"] for r in rows if r["status"] == "empty"}
for r in rows:
    if r["effect"] not in want:
        continue
    clip = (glob.glob(f"clips/*/{r['effect']}.mp4") or [None])[0]
    if not clip:
        continue
    scores = [(spread(clip, t), t) for t in TIMES]
    best, t = max(scores)
    if best >= 12:
        r["status"] = "ok"
        r["note"] = (r["note"] + f" content found at {t}s (2.5s frame was blank)").strip()
        thumb = clip.replace("clips/", "thumbs/").replace(".mp4", ".jpg")
        subprocess.run([FF, "-loglevel", "error", "-y", "-ss", str(t), "-i", clip, "-frames:v", "1", thumb])
        small = thumb.replace("thumbs/", "small/")
        if os.path.exists(small):
            os.remove(small)  # make_index.py regenerates it from the new thumb
    print(f"{r['effect']}: {r['status']} (best spread {best} at {t}s)")

with open("RESULTS.csv", "w", newline="") as f:
    w = csv.DictWriter(f, rows[0].keys())
    w.writeheader()
    w.writerows(rows)
