# Motion rules (from AAL-14 review)

1. **Copy the source's moves, not its content.** Match its cut pace, its transition logic (morph, wipe, hard colour cut, camera push) and its density. Never reuse its footage, music, faces or logos.
2. **Pain in 3 seconds, proof right after.** First readable line by 0.5s, finished by 3s. The proof beat comes straight after the pain, on screen by ~5s, before the product/method (Salman 2026-11-02).
3. **Reading time.** On-screen line holds ≈ 0.3s per word + 0.5s (a 20-word line ≈ 6.5s). Over ~25 words: split into two beats. Nothing important under 36px at 1080 wide.
4. **No sparse frames.** Every frame has one hero (headline, card, number) filling at least a third of the screen. A lone small chart in white space fails.
5. **One idea per beat, one move per idea.** Build text word by word or line by line; key words in blue.
6. **Show the product.** At least one beat of real-looking app UI (our clips or rebuilt light UI) doing the work. Agents visible as agents (blue, "AI agent" tags, "Done 10:22").
7. **Seek-safe.** Everything on the paused GSAP timeline; seeded randomness; no CSS animations or timers; animate transforms/opacity, not top/left/font-size.
8. **Reuse first.** Approved `moves/` → catalog clips → registry → hand-built. New moves go to `moves/` after approval.
9. **Length.** Source length, capped at 45s. Say what you cut. Ads over the source by more than ~8s need a reason.
10. **End card** always the template one, ~2.5-3.5s, guarantee day 90.
