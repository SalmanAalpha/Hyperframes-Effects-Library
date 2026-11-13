# Look: latest headroom.aalpha.ai (captured 2026-11-02)

Source of truth: `motion/site-stills-2026-11-02/` (README + stills). Re-check the live site before a big new batch; it changes often.

| Token | Value | Use |
| --- | --- | --- |
| --page | #f6f7f9 | background (soft radial to #ffffff centre / #eef0f4 edge is fine) |
| --ink | #161b26 | headlines, pill button |
| --sec | #4b5565 | body |
| --muted | #687182 | labels |
| --blue | #2a78d6 | the one accent: key words, agents, progress, bleeds |
| --line | #e3e6eb | card borders, dividers |

- Font: Manrope (`template/fonts/manrope-latin.woff2`, weights 200-800). Headlines 600-700, tight tracking (-0.03 to -0.05em). Labels 700, uppercase, +0.18em tracking.
- Mark: rounded U + blue dot (`motion/site-stills-2026-11-02/logo-headroom-2026-11.svg`). Wordmark "headroom" + small "by Aalpha".
- Cards: white, 1px --line border, 16-24px radius, soft shadow. App UI is the native white/blue look, never dark.
- Full-blue bleed scenes are OK as colour cuts (ehabedit, borja). No black backgrounds, no gold (old look) unless the source's whole mechanic depends on dark; say why in SCRIPT.md.
- SAMPLE chip: small mono-ish uppercase grey pill, bottom corner of any made-up data. Text "SAMPLE", "SAMPLE AGENCY · MADE-UP NUMBERS", or "SAMPLE NAMES".
- End card (in `template/`): mark, "headroom by Aalpha", guarantee row "40+ hours a week back by day 90, / or we work for free." (second clause blue), ink "Book a call" pill.
- Silent, no burned-in captions by default (Salman captions in CapCut). On-screen copy is the design, not captions. If an ad needs karaoke captions, make them switchable (`nocap` build).
