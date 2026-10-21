"""Pull each effect's editable fields (data-composition-variables) into knobs.json.
Usage: python3 knobs.py <effect> <composition.html>   (adds/updates one effect)
       python3 knobs.py --scan                        (every effect in work/)"""
import glob, html, json, os, re, sys

OUT = "knobs.json"


def extract(path):
    src = open(path).read()
    m = re.search(r"data-composition-variables='(\[.*?\])'", src, re.S)
    if not m:
        return []
    try:
        items = json.loads(html.unescape(m.group(1)))
    except ValueError:
        return []
    keep = ("id", "type", "role", "label", "description", "default")
    out = []
    for v in items:
        k = {x: v[x] for x in keep if x in v}
        if v.get("options"):
            k["options"] = [o.get("label", o.get("value")) for o in v["options"]]
        out.append(k)
    return out


knobs = json.load(open(OUT)) if os.path.exists(OUT) else {}
if sys.argv[1] == "--scan":
    for d in sorted(glob.glob("work/*/")):
        fx = os.path.basename(d.rstrip("/"))
        f = glob.glob(f"{d}compositions/{fx}.html") + glob.glob(f"{d}compositions/components/{fx}.html")
        if f:
            knobs[fx] = extract(f[0])
else:
    knobs[sys.argv[1]] = extract(sys.argv[2])
json.dump(knobs, open(OUT, "w"), indent=1, sort_keys=True)
