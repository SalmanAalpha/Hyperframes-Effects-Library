# Where every asset comes from

Paths are relative to the project root (the Aalpha project, or the Video Creation kit, which mirrors it).

| Asset | Path | Real or made |
| --- | --- | --- |
| Words | `research/limitless-black-card/BLACK-CARD-COPY-2026-10-29.md` + "Verified claims" in `CLAUDE.md` | Real: Limitless copy, verified numbers |
| Font | `template/fonts/manrope-latin.woff2` (copied in by new_project.sh) | Real: Manrope, the site font |
| Logo | `template/assets/` (from `motion/site-stills-2026-11-02/logo-headroom-2026-11.svg`) | Real: current site mark |
| Colours, layout, end card | `reference/look.md`, screenshots in `motion/site-stills-2026-11-02/` | Rebuilt to match the site |
| Animations | `moves/moves.js` + `moves/README.md` | Ours. 7 approved, 8 pending |
| Product clips (approve list, reports feed, agents running, funnel, playbook...) | Listed in `research/pipeline/catalog/clips.json` (`path` field = file). Usual picks: `motion/founder-broll-1029/v2/approve/renders/approve.mp4`, `motion/hdr-001/graphics/reports-feed/renders/reports-feed.mp4`, `motion/hdr-001/graphics/beat8-account-managers/renders/beat8-account-managers.mp4` | Our rebuilds of the app UI, sample data, SAMPLE chips |
| App logos (Slack, ClickUp, Asana, Google Docs, Sheets) | Simple Icons paths or hand-drawn inline SVG in the ad's HTML | Real brand marks, shown as "tools we build inside" |
| Everything else (task lists, agent cards, chat boxes, counters, notifications) | Written new in the ad's `index.html` | Made. SAMPLE chip on anything that looks like data |
| Dot-grid effect (optional) | `motion/quran-dots-study/lib/dotfield.js` (example `aalpha.html`) | Ours |

Catalog clips with `names_client: true` show real client names: don't use them in ads without Salman's OK.
Never pulled from: the reference reel's footage, music, faces or logos; Shadow's site; anything naming a real client.
Gap: no real Headroom product screen recordings yet. If some arrive, put them in `social/raw-footage/`, add them to the catalog, and prefer them.
