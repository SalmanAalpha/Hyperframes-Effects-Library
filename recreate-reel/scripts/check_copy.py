#!/usr/bin/env python3
"""Check every on-screen line of an ad against the Black Card + claims list.
Usage: check_copy.py lines.txt   (one on-screen line per row; '#' rows and blanks ignored;
       prefix a row with 'LABEL:' for UI labels, which are listed but not failed)
Exit 1 on any FAIL."""
import re, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parents[4]
BC = (ROOT / "research/limitless-black-card/BLACK-CARD-COPY-2026-10-29.md").read_text()
CLAIMS_SRC = (ROOT / "CLAUDE.md").read_text()
CLAIMS = CLAIMS_SRC[CLAIMS_SRC.find("**Verified claims"):CLAIMS_SRC.find("Use their words")]

def norm(s, keep_lines=False):
    s = s.replace("’", "'").replace("‘", "'").replace("“", '"').replace("”", '"')
    s = re.sub(r"[✔👉*_`]", " ", s)
    if keep_lines:
        s = s.replace("|", "\n")  # table cells count as their own lines
        s = re.sub(r"[ \t]+", " ", s)
        s = re.sub(r" ?\n ?", "\n", s)
        s = re.sub(r"^\d+\. ", "", s, flags=re.M)  # numbered headlines
        return s.strip().lower()
    return re.sub(r"\s+", " ", s).strip().lower()

BCN, CLN = norm(BC, True), norm(CLAIMS, True)

def whole(n, src):
    """'whole' if n is one or more complete sentences of src, 'part' if only a fragment, None if absent."""
    found = False
    for m in re.finditer(re.escape(n), src):
        found = True
        i, j = m.start(), m.end()
        before = src[:i]
        ok_start = i == 0 or re.search(r'(\n|"|- |[.?!:]\s)$', before) is not None
        ok_end = n[-1:] in ".?!" or j == len(src) or src[j:j + 1] in "\n.?!,\""
        if ok_start and ok_end:
            return "whole"
    return "part" if found else None
BANNED_WORDS = ["shadow", "workflows", "solutions", "transform", "empower", "streamline",
                "overseas", "offshore", "revenue grows, margin doesn't", "delve"]
BANNED_NUM = [r"\b108\b", r"\b2\.1\b", r"\b84 (hours|could|can)"]
OLD_GUARANTEE = [r"\b30 days\b.*free", r"in 30 days", r"within 30 days"]

def main():
    rows = [r.rstrip("\n") for r in open(sys.argv[1], encoding="utf-8")]
    fails = 0
    for r in rows:
        if not r.strip() or r.lstrip().startswith("#"):
            continue
        label = r.startswith("LABEL:")
        text = r[6:].strip() if label else r.strip()
        n = norm(text)
        bad = [w for w in BANNED_WORDS if w in n]
        bad += [p for p in BANNED_NUM if re.search(p, n)]
        bad += ["old 30-day guarantee" for p in OLD_GUARANTEE if re.search(p, n)]
        if bad:
            fails += 1; print(f"FAIL   {text}\n       -> {', '.join(sorted(set(bad)))}"); continue
        if label:
            print(f"LABEL  {text}"); continue
        hit = whole(n, BCN) or None
        hitc = whole(n, CLN)
        if hit == "whole":
            print(f"BC     {text}")
        elif hitc == "whole":
            print(f"CLAIMS {text}")
        elif hit == "part" or hitc == "part":
            print(f"PART   {text}   <- only part of a sentence: OK if the beat splits one sentence across screens, otherwise it's a trim (needs Salman's OK)")
        else:
            print(f"NEW    {text}   <- not word for word in the Black Card or claims list: needs Salman's OK")
    print(f"\n{fails} fail(s)")
    sys.exit(1 if fails else 0)

if __name__ == "__main__":
    main()
