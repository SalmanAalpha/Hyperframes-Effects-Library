# Headroom moves library

These are reusable animation moves taken from the 7 inspo-recreate ads in `motion/inspo-recreate/` (2026-11-02). They live in `moves.js`, which gives you one global object, `HRMoves`, and `moves.css`, where every class starts with `.hr-`. Load both after GSAP. Every move has the same shape:

```js
const end = HRMoves.<move>(tl, target, at, opts); // returns the time the move settles
```

- `tl` is the paused timeline you register at `window.__timelines["main"]`.
- `target` is a selector or an element. Most moves build their own markup inside it, so you position and size the target in your own CSS and leave it empty.
- `at` is the start time in seconds.

All moves are seek-safe and deterministic. Random-looking effects use `HRMoves.rng(seed)`. Per-frame code runs on `tl.time()` through `HRMoves.onFrame(tl, fn)`. If you need per-frame code of your own, use `onFrame` and not `tl.eventCallback("onUpdate")`, because that call replaces the library's callback.

Helpers: `HRMoves.blurIn(tl, t, at, {d,y,s,blur})`, `HRMoves.blurOut(...)`, `HRMoves.split(t)` (wraps words in `.hr-w`), `HRMoves.rng(seed)`, `HRMoves.onFrame(tl, fn)`.

Status: moves from ehabedit and ayushfx are **APPROVED** (Salman signed off those ads). Moves from the other five ads are **pending Salman** until he reviews them.

| Move | What it looks like | From | Status | How to call it | Demo render |
| --- | --- | --- | --- | --- | --- |
| `typeBox` | A cursor drags open a dashed box with corner handles, then the line types in with a blue caret. `style:"solid"` gives the white prompt-box look | ayushfx (box), ehabedit (typing) | APPROVED | `HRMoves.typeBox(tl, "#box", 0.3, { text: "The fix is to find the hours first, then hand them to agents." })` | `renders/demo-typeBox.mp4` |
| `blobWipe` | Six-petal blue blobs bloom in at the corners and spin. `mode:"cover"` spins one blob up to fill the frame as a wipe and returns the time the frame is fully blue | ayushfx | APPROVED | `const full = HRMoves.blobWipe(tl, "#cover", 2.6, { mode: "cover" })` | `renders/demo-blobWipe.mp4` |
| `ribbonSweep` | A very thick blue band draws across the frame, bends to a new curve, then wipes off | ayushfx | APPROVED | `HRMoves.ribbonSweep(tl, "#rib", 0.2, { to: "M -260 1180 C ...", toAt: 1.9, outAt: 3.6 })` | `renders/demo-ribbonSweep.mp4` |
| `underlineMorph` | A blue underline grows under one word, the other words blur away, and the underline becomes a square and then the Headroom dot | ehabedit | APPROVED | `HRMoves.underlineMorph(tl, "#ineff", 1.4, { others: words, dot: { x: 540, y: 787, r: 24 } })` | `renders/demo-underlineMorph.mp4` |
| `glyphStorm` | Hundreds of code glyphs (`/ \ # + < >`) pop in and jitter behind a headline, leaving a clear band for the text, then blow outward | ehabedit | APPROVED | `HRMoves.glyphStorm(tl, "#storm", 0, { dur: 3, clear: { top: 780, bottom: 1060 } })` | `renders/demo-glyphStorm.mp4` |
| `wordBuild` | Builds a line word by word. `blur` (default) blurs each word up into place. `karaoke` starts every word grey and turns it ink, or blue for key words, as it is "said". `drop` drops words in at alternating heights and they settle | all ads; karaoke from nocodealex, drop from ayushfx | APPROVED (blur, drop); karaoke pending Salman | `HRMoves.wordBuild(tl, "#hook", 0.1, { s: 0.08 })` | `renders/demo-wordBuild.mp4` |
| `highlightSweep` | A light sheen runs through a blue word | noahmgfx | pending Salman | `HRMoves.highlightSweep(tl, "#rem", 2.0)` | `renders/demo-highlightSweep.mp4` |
| `splitFlap` | A departures-board number. The digits spin, then land left to right and turn blue | nocodealex | pending Salman | `HRMoves.splitFlap(tl, "#flaps", 0.3, { value: "$50,000" })` | `renders/demo-splitFlap.mp4` |
| `pileBurst` | Notification cards (Slack, ClickUp, Gmail, and so on) pile up and jitter, then burst outward and blur away | noahmgfx | pending Salman | `HRMoves.pileBurst(tl, "#pile", 0.2, { hold: 2.5, items: [...] })` | `renders/demo-pileBurst.mp4` |
| `orbGather` | A blue orb grows, source chips slide in on dashed lines and get pulled into it, then the orb flies to a target spot, such as a card header | noahmgfx | pending Salman | `HRMoves.orbGather(tl, "#orbs", 0.1, { tag: "FINDING THE HOURS", to: { x: 137, y: 645 } })` | `renders/demo-orbGather.mp4` |
| `agentTags` | A white card unrolls a list of repeat jobs with hour bars. The top N rows tint blue and each gets an "AI agent" tag | noahmgfx | pending Salman | `HRMoves.agentTags(tl, "#card", 0.2, { title: "Repeat work", chip: "SAMPLE", rows: [...] })` | `renders/demo-agentTags.mp4` |
| `stampSlam` | A tilted rubber-stamp label ("A GUESS") slams down from big to size, and the card under it jolts | borja | pending Salman | `HRMoves.stampSlam(tl, "#stamps", 1.5, { text: "A GUESS", x: 560, y: 1240, shake: "#gcard" })` | `renders/demo-stampSlam.mp4` |
| `ringCountdown` | A blue ring closes, then drains while the number counts from one value to another. The number turns blue and pops | divyansh | pending Salman | `HRMoves.ringCountdown(tl, "#ring", 0.2, { from: 45, to: 5, unit: "hours" })` | `renders/demo-ringCountdown.mp4` |
| `chapterHud` | Viewfinder corners, HEADROOM at top left, the chapter name at top right, and a thin progress line that fills along the bottom | borja | pending Salman | `HRMoves.chapterHud(tl, "#hud", 0, { dur: 30, chapters: [[0, "01 · MEASURE"], [8, "02 · AUTOMATE"]] })` | `renders/demo-chapterHud.mp4` |
| `endCard` | The standard Headroom end card: the mark draws, "headroom by Aalpha", the guarantee row "40+ hours a week back by day 90, / or we work for free.", and a "Book a call" pill. `reveal:"circle"` opens it from a dot | all ads; circle reveal from ehabedit | APPROVED | `HRMoves.endCard(tl, "#end", 20.5, { reveal: "circle" })` | `renders/demo-endCard.mp4` |
| `wordFlips` | One word or short phrase per beat, hard cut. The background flips blue/page and the word takes the other colour. Cuts can speed up to ~0.27s. Per beat: `in:"slide"` (skewed motion-blur slide), `in:"pop"`, `echo:true` (blurred glow behind the word) | yp.motionstudio (AAL-16) | APPROVED | `HRMoves.wordFlips(tl, "#flips", 0, { beats: [{ text: "Talented", d: 0.55, bg: "blue", in: "slide" }, { text: "because", d: 0.3, bg: "page", echo: true }] })` | `renders/demo-wordFlips.mp4` |
| `stackSlam` | Small line types in with a caret, one BIG blue word slams down, small line rises under it. `bg` paints its own background | yp.motionstudio (AAL-16) | APPROVED | `HRMoves.stackSlam(tl, "#stack", 0.55, { top: "people don't", big: "leave", bottom: "because the work is hard.", bg: "#f6f7f9" })` | `renders/demo-wordFlips.mp4` |
| `lightSmear` | A soft white wavy glow sweeps left to right across the frame. Use over a blue bleed as a transition | yp.motionstudio (AAL-16) | APPROVED | `HRMoves.lightSmear(tl, "#smear", 2.05)` | `renders/demo-wordFlips.mp4` |
| `particleMorph` | Its own file `particles.js` (load after moves.js). One canvas of ~2,400 dots morphs with no cuts between 3D forms: `orbit` (cluster in dashed rings), `remember` (4 blue dots, rest faint), `sphereLoose`/`sphere`, `plane` (dot grid with task spikes; `spike`, `wave`, `blue3` turns the top 3 blue), `disk` (`live` = 44 blue + 15 pale = "40+ live, 15 queued"), `point`. `after(ctx,t,cam,project)` draws extras (ripples, glow, chips that follow a point) | neuronvisuals (AAL-16) | APPROVED | `const PM = ParticleMorph({ canvas, shapes: ParticleMorph.shapes(), keys: [{ t: 0, s: "orbit", rx: 0 }, { t: 3, s: "sphere", rx: 0.25, tr: 1.2 }] }); HRMoves.onFrame(tl, PM.draw)` | `renders/demo-particleMorph.mp4` |
Contact sheet (one mid frame per demo): `renders/moves-sheet.png`.

## Notes

- The demos are `demo-<move>.html` in this folder. They load `moves.js`, `moves.css` and `fonts/manrope-latin.woff2` from here, because HyperFrames lint rejects `../` paths. Render one from this folder:
  ```
  npx hyperframes@0.8.74 render . -c demo-typeBox.html -q draft -o renders/demo-typeBox.mp4
  ```
- `lint` only reads `index.html`. To lint a demo, copy it as `index.html` into a scratch folder with `moves.js`, `moves.css` and `fonts/`. Every demo and the template give 0 errors and 1 warning, `nested_structure_needs_subcomposition`. The existing ads use the same single `#all` clip pattern.
- `underlineMorph` reads the word's position when the move first plays, after fonts load. You don't need to measure anything by hand.
- Demo copy comes from Black Card lines or the verified claims list (45 to 5 hours, $50,000). Made-up app views carry a SAMPLE chip.
- `template/` holds a copy of `moves.js` and `moves.css`. After you change the library here, copy both files into `template/` again.
