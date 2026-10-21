# Effects library: brief for the tech team

**Owner:** Salman · **Written:** 2026-10-21 · **Status:** ready to run

## What we want

Render a 5-second preview clip of each HyperFrames registry effect that's useful
for ads and marketing, then put them all on one page we can scroll. The name
under each clip is what we type to use it ("use `count-up` with these numbers").

Pilot = the 60 effects listed below. If the pilot works, we run the other ~390.

## Done looks like

- `motion/effects-library/clips/<effect>.mp4`: one 5s clip per effect, 1080x1920
- `motion/effects-library/thumbs/<effect>.jpg`: frame at 2.5s
- `motion/effects-library/index.html`: a grid of clips (autoplay, muted, loop)
  with name, category, and the one-line description from the catalog. Filter by
  category. Opens from a local server, no hosting
- `motion/effects-library/RESULTS.csv`: effect, status (ok / failed / empty),
  render seconds, error note
- A short note: total render time, failure count, anything that needed fixing

## Rules

- **Local only, $0.** Don't use `hyperframes cloud`, `lambda` or `cloudrun`
  (those can cost money). Don't use `publish` (it puts files online).
- Leave defaults alone. Don't restyle the effects. The point is to see what each
  one looks like out of the box.
- One failure shouldn't stop the run. Log it and move on.
- Don't commit the clips (too big). Commit the script, index.html, RESULTS.csv.
  Add `clips/` and `thumbs/` to `.gitignore`.

## Setup

- Node + npx (already on this Mac). FFmpeg is at `motion/ffmpeg-bin/bin` (no
  Homebrew). Run this first in every terminal:
  `export PATH="$PWD/motion/ffmpeg-bin/bin:$PATH"`
- Pin the version: `npx hyperframes@0.8.74 ...` everywhere.
- Full effect list with descriptions: `motion/HYPERFRAMES-CATALOG.txt`, or as
  JSON: `npx hyperframes@0.8.74 catalog --json`.

## How (suggested, verify on effect #1 first)

For each effect:

1. Make a blank portrait project:
   `npx hyperframes@0.8.74 init work/<effect> --resolution=portrait --non-interactive`
2. Install the effect:
   `npx hyperframes@0.8.74 add <effect> --dir work/<effect> --json --no-clipboard`
   The `--json` output includes the files written and an include snippet.
3. Wire the snippet into `work/<effect>/index.html` and set the root duration to
   5s. **Not verified yet:** blocks are sub-compositions and must be referenced
   from index.html. Components are snippets merged into it. Check the
   `hyperframes-registry` skill if Claude Code is helping. Get this right on one
   block and one component before you script it.
4. Check it: `npx hyperframes@0.8.74 check work/<effect>`
5. Render it:
   `npx hyperframes@0.8.74 render work/<effect> -q draft -o clips/<effect>.mp4`
   Use draft quality. These are previews.
6. Thumbnail: `ffmpeg -ss 2.5 -i clips/<effect>.mp4 -frames:v 1 thumbs/<effect>.jpg`
7. Log a row in RESULTS.csv.

Then build index.html from RESULTS.csv + the catalog JSON.

**Expect failures:** WebGPU shader effects may not render headless on this Mac,
and some effects show nothing until you give them images or text. Mark those
"empty" and keep going. Don't spend time fixing them in the pilot.

**Time estimate (unverified):** 30s to 2 min per effect, so about 1 hour for the
pilot. Time the first 5 and report back if it's much slower.

## The pilot list (60)

| Category | Effects |
| --- | --- |
| Numbers | `count-up`, `number-wheel`, `number-pop-in`, `slot-machine-roll`, `apple-money-count`, `mk-progress-stat`, `conic-progress-ring`, `star-rating-fill` |
| Charts | `animated-bar-chart`, `bar-chart-race`, `decline-chart`, `data-chart`, `chart-story`, `heatmap`, `mk-line-graph`, `comparison-split`, `before-after-wipe` |
| Captions | `caption-pill-karaoke`, `caption-kinetic-slam`, `caption-highlight`, `caption-emoji-pop`, `caption-editorial-emphasis`, `caption-weight-shift` |
| Headline text | `headline-slam`, `scramble-reveal`, `typewriter`, `per-word-rise`, `marker-highlight`, `strikethrough-replace`, `inline-highlight`, `kinetic-type-swap` |
| Chat + social proof | `slack-notification-ad`, `notification-pileup`, `notification-stack`, `chat-thread`, `ai-chat-reveal`, `claude-exchange`, `x-post`, `reddit-post`, `testimonial-proof-card`, `social-proof-card`, `trust-strip`, `logo-wall` |
| Product + screen | `agent-cursor`, `cursor-zoom-follow`, `ui-focus-zoom`, `browser-device-stage`, `scroll-feed`, `marker-checklist-card` |
| Camera | `push-in`, `rack-focus`, `whip-pan`, `camera-shake`, `parallax-zoom` |
| Hand-drawn | `hw-underline`, `hw-callout-circle`, `hw-arrow` |
| Founder footage | `camcorder-hud`, `lt-kicker-name` |
| Close | `cta-close` |

If an effect name in this table isn't in the catalog, skip it and note it.

## Inputs

Checked 2026-10-21 by installing all 60 into a scratch project: every one
ships with its own sample content, so **the pilot needs no files from us**.

To reuse an effect in a real Aalpha ad later, these go in `motion/effects-library/inputs/`:

| Folder | What | Used by |
| --- | --- | --- |
| `logos/` | Aalpha + Headroom marks (SVG), tool logos: Slack, GHL, ClickUp, Asana, Google | `ai-chat-reveal`, `logo-wall`, `trust-strip`, `cta-close` |
| `screens/` | Headroom screenshots at 2x: dashboard, owner view, manager view, Slack app | `browser-device-stage`, `ui-focus-zoom`, `cursor-zoom-follow`, `agent-cursor`, `scroll-feed` |
| `footage/` | Founder talking clips, 9:16 | `rack-focus`, `whip-pan`, `camera-shake`, `push-in`, `camcorder-hud`, `lt-kicker-name` |
| `people/` | Headshots for quote cards (permission needed) | `testimonial-proof-card`, `social-proof-card`, `chat-thread` |
| `copy.md` | Real quotes, Slack messages, chat lines | chat, Slack, X and Reddit effects |
| `numbers.md` | Only numbers from the verified claims list | numbers and chart effects |

## Questions → Salman

Anything that needs money, an account, or putting files online goes to Salman
first.
