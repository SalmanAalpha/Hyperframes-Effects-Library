---
name: recreate-reel
description: Rebuild a reference reel (or a whole folder of them) as a silent 1080x1920 Headroom test ad in HyperFrames, in the latest headroom.aalpha.ai look, with Black Card copy and one rotated verified proof. Covers watch → beat map → angle + proof → copy check → build from the moves library → render under the lock → contact-sheet check → send to Salman → commit + Linear. Use when Salman says "recreate this reel", "make an ad like this", "turn this folder into ads", "do the next one", drops a reel path or folder, or says /recreate-reel. One at a time by default; batch (parallel builders) when he asks. Never posts, never spends credits, never adds a voice.
---

# Recreate a reel as a Headroom ad (v1, 2026-11-02, AAL-14)

```
reel(s) ─► 1 breakdown ─► 2 angle + proof ─► 3 script + copy check ─► 4 build ─► 5 render ─► 6 sheet check ─► 7 send ─► 8 log
```

Born from AAL-14 (7 Instagram reels, `motion/inspo-recreate/`). Salman approved ehabedit + ayushfx there; their moves are in `moves/` as APPROVED.

## 0. Inputs and mode

| Input | If missing |
| --- | --- |
| Reel file(s) or folder | Ask once for the path. List what's in it (dedupe "(1)" copies), with length and size (`ffprobe`). |
| Mode | **One at a time** (default): build one, send it, wait for "next". **Batch**: only when Salman says parallel / batch / all at once. |
| Angle / proof per reel | Pick them yourself (step 2) and show the table before building. Don't ask unless two reels want the same angle. |

Every run: one Linear ticket in team AAL for the batch (search first; `log-my-work`). Output folder `motion/<batch-name>/<reel-name>/`, one per reel; batch index `motion/<batch-name>/REVIEW.md`.

## Lean mode (default since 2026-11-03): about 4 messages per video

Trigger: "yo recreate this" + a path (or any trigger above). Goal: fewest messages and smallest
chat, because every message re-reads the whole chat.

| Msg | Salman | Me |
| --- | --- | --- |
| 1 | path + "recreate this" | Steps 1-6 without stopping. Breakdown, build, render, sheet check go to **Sonnet** subagents that return only paths + pass/fail. I (Opus) only pick angle + proof and check copy. Reply: video + half-size sheet + a 3-row plan table (angle, proof, lines) + any NEW line needing his OK. Max 10 lines. |
| 2 | all notes in one message | Ask "anything else before I render?" only if a note is unclear. Fix via Sonnet, one render. |
| 3 | "finished" or one more round | `finished` skill, commit, Linear comment, one line back. |
| 4 | — | Tell him to `/clear` before the next reel. |

Rules: no recaps, no logs in chat, don't Read big files when `grep`/`sed -n` will do, don't open
`STATUS-ARCHIVE.md` unless needed. **Check-ins** ("step by step"): stop after the plan table,
before building. **Batch** (a folder): one plan table for all reels, one OK, 2 Sonnet builders
at a time, one sheet per reel back.

## 0b. Faithful means the SCENES, not the timing (Salman 2026-11-05, after batch 2 was rejected)

A recreate copies the source's scene design: the hero object, camera moves, transitions, layout, text style and cut order, with Headroom content and Black Card copy swapped in. Matching only length and pacing is a failure ("you didn't recreate anything"). Rules:
- Write `BEATS-MAP.md` (source beat -> our beat, one row each) before building. If a row says "plain text on grey", the source must have been plain text on grey.
- Builder briefs must say "copy the source's scenes", never "match length and pacing".
- Every reel ends with `renders/compare.png`: source frames on the top row, ours on the bottom, same times. Look at it before reporting. Never judge only our own contact sheet.
- Do one reel first and show Salman the compare image before building the rest of a batch.

## 1. Breakdown (per reel)

```bash
bash .claude/skills/recreate-reel/scripts/breakdown.sh "<reel.mp4>" motion/<batch>/<name>
```
Writes `src/frames/` (every 0.5s + scene cuts), `src/source-sheet.png`, `src/transcript.txt` (Groq Whisper via the watch skill; skipped if silent). Look at the sheet, then write `BEATS.md`: time | on screen | motion | cut pace | text/VO | hook mechanic. Note the source's colour logic, type style and length.

Batch mode: steps 1-6 run inside one builder subagent per reel (step 9).

## 2. Angle + proof

- **Angle** = one row of `reference/copy-angles.md`. Each reel in a batch gets a different angle. Check `reference/used-lines.md` and don't open on a line that's already running.
- **Proof** = one row of `reference/proofs.md`, rotated. 108 / 84 / 2.1 are parked unless Salman asks.
- Show Salman the table (reel | angle | opening pain line | proof) in the first reply, then go. He has said "do it, don't ask twice": no second confirmation.

## 3. Script + copy check

- Order: **PAIN** in the first 3 seconds, in Limitless's words. **PROOF right after the pain**, on screen by ~5s (Salman 2026-11-02: "include proof earlier in the videos"). Then the **PRODUCT** working (repeated-tasks list, approve list, agents running, reports building themselves, client updates going out, Slack app / desktop app / Chrome extension). End card.
- Copy = whole sentences from `research/limitless-black-card/BLACK-CARD-COPY-2026-10-29.md`, word for word. Cutting whole sentences is fine; trimming inside one is not. A line that isn't there is **NEW** and needs Salman's OK. UI labels are fine but get listed.
- Anything that looks like app data but isn't verified wears a SAMPLE chip.
- Write `SCRIPT.md` (template in `reference/script-template.md`), put every on-screen line in `lines.txt` (one per line), then:
```bash
python3 .claude/skills/recreate-reel/scripts/check_copy.py motion/<batch>/<name>/lines.txt
```
It marks each line BLACK CARD / CLAIMS / NEW and fails on banned words, 108/84/2.1, the old 30-day guarantee, Shadow, and "revenue grows, margin doesn't". Fix every FAIL before building.

## 4. Build

```bash
bash .claude/skills/recreate-reel/scripts/new_project.sh motion/<batch>/<name>
```
Copies `template/` (stage, fonts, look tokens, SAMPLE chip, Headroom end card) and `moves/moves.js|css` into the folder.

Order of reach, cheapest first:
1. **Approved moves** in `moves/README.md` (call `HRMoves.<move>(tl, el, at, opts)`).
2. **Our clips** from `research/pipeline/catalog/clips.json` (lane agent, look light; copy files in, never edit originals). Approve-jobs, reports-feed, beat8-account-managers, playbook-steps, agents-roadmap, funnel-light are the usual product shots.
3. **HyperFrames registry** effects (`hyperframes-registry` skill; local previews in `motion/effects-library/` if that folder exists).
4. Hand-built GSAP, following the `hyperframes-animation` skill. A good new move gets added to `moves/` as "pending Salman" after the ad is approved.

GSAP is bundled at `template/vendor/gsap.min.js` (no internet needed to render). App logos (Slack, ClickUp...) are not files in the kit: draw them as simple inline SVG or letter tiles. Read `reference/look.md`, `reference/assets.md` and `reference/motion-rules.md` before writing scenes. HyperFrames contract: `hyperframes-core` skill (paused timeline in `window.__timelines["main"]`, `data-composition-id="main"`, `class="clip"`, no `../` paths, no template-literal selectors, seeded randomness only).

## 5. Render (one at a time on this Mac)

```bash
bash .claude/skills/recreate-reel/scripts/render.sh motion/<batch>/<name> <name>-v1
```
Lints, waits for the shared lock (`motion/.render.lock`), renders high quality, always frees the lock, then writes the contact sheet. A stale lock (no render running: `pgrep -f "hyperframes.*render"` empty) can be removed with `rmdir motion/.render.lock`.

## 6. Check it (before Salman sees it)

Read `renders/<name>-v1-sheet.png`. Fail and fix if: text overlaps or is cut off; a frame is empty or sparse; type under ~36px carries meaning; a line stays up too short to read (≈ 0.3s per word) or far too long; SAMPLE chip missing on made-up data; the end card guarantee isn't the day-90 line. Then re-run `check_copy.py`. Report what you did NOT check (e.g. didn't watch the full video).

## 7. Send

`SendUserFile` the mp4 (display render), and in chat: length, angle, the flow in 3-5 lines, proof, NEW lines/labels quoted, flags. One-at-a-time mode: wrap up with "Good, next one" / "Changes first" buttons and stop.

## 8. Log

Skip any item whose tool or file isn't there (e.g. on the portable Video Creation kit: no Linear, no STATUS.md, no Codex mirror). Never skip the commit if it's a git repo, and never skip `used-lines.md`.


- Append the opening line + proof to `reference/used-lines.md`.
- Update `motion/<batch>/REVIEW.md` (table: ad | render | length | angle | proof | status).
- Commit the folder (not `src/frames`, `renders/work-*`; `.gitignore` from new_project.sh covers them). Message says why; end with the Co-Authored-By line. Never push.
- Comment on the Linear ticket; STATUS.md entry for the batch; rsync the Codex mirror (`rsync -a --relative ./motion/<batch> ./STATUS.md ~/Documents/Work/Codex/Aalpha/`).
- When Salman says "finished" about one: run the `finished` skill.

## 9. Batch mode

1. One `Agent` (general-purpose, background) per reel, all in one message, each prompt = "Read and follow `.claude/skills/recreate-reel/SKILL.md` steps 1-6 for <reel> → <folder>. Angle: <row>. Proof: <row>. Don't commit, post or send; report in under 200 words."
2. Renders queue on the lock automatically, so parallel builds don't overload the Mac.
3. As each reports back: do step 6 yourself on its sheet, then step 7 for that ad. Steps 8 once at the end (one commit per batch is fine).
4. If Salman says stop or one at a time: `TaskStop` the rest, free the lock, list what each left on disk.

## Running on another computer

The Video Creation kit mirrors this project's layout, so the paths above work unchanged. Setup is in the kit's `SETUP.md`: Node 18+, the `hyperframes` and `watch` plugins, ffmpeg in `motion/ffmpeg-bin/bin` (or on PATH), and the user's own Groq key for transcripts (without one, breakdown still makes frames and the sheet). Render command and version are pinned: `npx hyperframes@0.8.74`.

## Never

Post, schedule, upload to Meta/GHL, spend Higgsfield/ElevenLabs credits, add VO or music, reuse the source's footage/music/faces/logos, show worker-tracking/employee surveillance as the hero (agent side first), or ship a guarantee that says 30 days.
