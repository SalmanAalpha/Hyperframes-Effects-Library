# Setup on a new computer (about 15 minutes, once)

Built and tested on macOS (Apple silicon). Each step says what you should see.

1. **Copy this whole folder** anywhere, e.g. `~/Video Creation`. Keep the folder structure as it is.
2. **Install Node 18 or newer** from https://nodejs.org (the LTS button). Check it in Terminal:
   ```bash
   node --version
   ```
   You should see `v18` or higher.
3. **Install Claude Code** if it isn't there (https://claude.com/claude-code), then open it in this folder:
   ```bash
   cd ~/"Video Creation" && claude
   ```
4. **Add the two plugins.** Inside Claude Code, type these one at a time:
   ```
   /plugin marketplace add anthropics/claude-plugins-official
   ```
   ```
   /plugin install hyperframes@claude-plugins-official
   ```
   ```
   /plugin marketplace add bradautomates/claude-video
   ```
   ```
   /plugin install watch@claude-video
   ```
   You should see each one reported as installed. Restart Claude Code after.
5. **Transcripts (optional).** For the breakdown step to transcribe a reel's voice, the watch plugin needs your own Groq API key (free at https://console.groq.com). Run its setup once:
   ```bash
   python3 ~/.claude/plugins/cache/claude-video/watch/*/skills/watch/scripts/setup.py
   ```
   It asks for the key and saves it outside this folder. Without it, frames and sheets still work; only the transcript is skipped.
6. **FFmpeg.** Already included in `motion/ffmpeg-bin/` (Apple silicon build). On an Intel Mac or Linux, install ffmpeg yourself and delete `motion/ffmpeg-bin/` so the scripts use yours.
7. **Check it works.** In Terminal, from this folder:
   ```bash
   bash .claude/skills/recreate-reel/scripts/selftest.sh
   ```
   You should see `SELFTEST PASSED` and a test video in `motion/_selftest/renders/`. The first run needs internet: it downloads HyperFrames and a headless browser, so give it a few minutes. After that, renders work offline (GSAP is bundled).
8. **Make a video.** In Claude Code:
   ```
   /recreate-reel ~/Desktop/some-reel.mp4
   ```

Keeping it current: on the main computer, `bash .claude/skills/recreate-reel/scripts/export_kit.sh` refreshes this folder. `KIT-VERSION.txt` says when it was last exported.
