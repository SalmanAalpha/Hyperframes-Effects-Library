/* Headroom moves library (HRMoves)
   Reusable animation moves pulled from the 7 inspo-recreate ads (2026-11-02).
   Load after GSAP and moves.css. Every move has the same shape:

       HRMoves.<move>(tl, target, at, opts)  ->  returns the time (seconds) the move settles

   tl      the paused GSAP timeline you register at window.__timelines["main"]
   target  a CSS selector string or an element. Most moves BUILD their markup inside it,
           so give the target its position/size in your own CSS and leave it empty.
   at      start time on tl, in seconds
   opts    optional settings (see each move)

   Rules kept here so every ad stays render-safe:
   - seek-safe: all motion is GSAP tweens on tl, or per-frame code driven by tl.time()
     through HRMoves.onFrame (never wall-clock, never requestAnimationFrame)
   - deterministic: random looks come from HRMoves.rng(seed), never Math.random
   - no template-literal selectors; elements are passed to GSAP directly
   If you need your own per-frame code, use HRMoves.onFrame(tl, fn) instead of
   tl.eventCallback("onUpdate", ...), which would replace the library's callback. */
(function () {
  "use strict";

  const SVGNS = "http://www.w3.org/2000/svg";
  const BLUE = "#2a78d6", INK = "#161b26", GREY = "#cfd5de";

  // ---------- helpers ----------
  function el(t) { return typeof t === "string" ? document.querySelector(t) : t; }
  function all(t) {
    if (typeof t === "string") return Array.prototype.slice.call(document.querySelectorAll(t));
    if (Array.isArray(t)) return t.map(el);
    return [t];
  }
  function mk(parent, tag, cls, html) {
    const d = document.createElement(tag);
    if (cls) d.className = cls;
    if (html != null) d.innerHTML = html;
    if (parent) parent.appendChild(d);
    return d;
  }
  function svg(parent, tag, attrs) {
    const n = document.createElementNS(SVGNS, tag);
    Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (parent) parent.appendChild(n);
    return n;
  }
  function pick(v, d) { return v === undefined || v === null ? d : v; }

  // seeded random (mulberry32). rng(seed)() -> 0..1
  function rng(seed) {
    let s = (seed | 0) || 1;
    return function () {
      s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // per-frame hook driven by the timeline clock (seek-safe). fn(t) gets tl.time().
  function onFrame(tl, fn) {
    if (!tl.__hrFrames) {
      tl.__hrFrames = [];
      const prev = tl.eventCallback("onUpdate");
      tl.eventCallback("onUpdate", function () {
        const t = tl.time();
        if (prev) prev();
        for (let i = 0; i < tl.__hrFrames.length; i++) tl.__hrFrames[i](t);
      });
    }
    tl.__hrFrames.push(fn);
    fn(0);
  }

  // composition root (for moves that need stage coordinates)
  function layerOf(node) {
    return (node && node.closest && node.closest("[data-composition-id]")) || document.body;
  }
  // rect of node in layer coordinates (works when the preview scales the stage)
  function relRect(node, layer) {
    const a = node.getBoundingClientRect(), b = layer.getBoundingClientRect();
    const k = layer.offsetWidth ? b.width / layer.offsetWidth : 1;
    return { l: (a.left - b.left) / k, t: (a.top - b.top) / k, w: a.width / k, h: a.height / k };
  }

  // split text nodes into <span class="hr-w"> words, keeping inner elements and their classes
  function split(target) {
    const root = el(target);
    if (!root || root.querySelector(".hr-w")) return root ? Array.prototype.slice.call(root.querySelectorAll(".hr-w")) : [];
    const walk = function (node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (tok) {
            if (!tok) return;
            if (/^\s+$/.test(tok)) { frag.appendChild(document.createTextNode(" ")); return; }
            const s = document.createElement("span"); s.className = "hr-w"; s.textContent = tok; frag.appendChild(s);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.nodeName !== "BR") walk(n);
      });
    };
    walk(root);
    return Array.prototype.slice.call(root.querySelectorAll(".hr-w"));
  }

  // the two workhorse entrances every ad used
  function blurIn(tl, target, at, o) {
    o = o || {};
    tl.fromTo(target, { opacity: 0, y: pick(o.y, 18), filter: "blur(" + pick(o.blur, 10) + "px)" },
      { opacity: 1, y: 0, filter: "blur(0px)", duration: pick(o.d, 0.45), stagger: pick(o.s, 0), ease: o.ease || "power3.out" }, at);
    return at + pick(o.d, 0.45);
  }
  function blurOut(tl, target, at, o) {
    o = o || {};
    tl.to(target, { opacity: 0, y: pick(o.y, 0), filter: "blur(" + pick(o.blur, 10) + "px)", duration: pick(o.d, 0.3), stagger: pick(o.s, 0), ease: "power2.in" }, at);
    return at + pick(o.d, 0.3);
  }

  const CURSOR_SVG = '<path d="M4 2 L4 20 L9 15.5 L12.5 22 L15.5 20.6 L12 14 L19 14 Z" fill="#161b26" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/>';
  const MARK_SVG = '<path d="M7 9v13a4 4 0 0 0 4 4h10a4 4 0 0 0 4-4V9" fill="none" stroke="#161b26" stroke-width="3" stroke-linecap="round" pathLength="1"/><circle cx="16" cy="12" r="3" fill="#2a78d6"/>';

  // =====================================================================
  // 1. typeBox  (ayushfx selection box + ehabedit typed prompt)
  //    A box is dragged open by a cursor (dashed, with corner handles), then the
  //    line types in with a caret. style:"solid" gives the white prompt-box look.
  //    opts: text, style ("dashed"|"solid"), drag (s, 0 = fade in), typeDur (s),
  //          cursor (true), hold (caret blink after typing, s), fontSize (px)
  // =====================================================================
  function typeBox(tl, target, at, o) {
    o = o || {};
    const box = el(target);
    const text = o.text || "";
    box.classList.add("hr-tbox");
    if (o.style === "solid") box.classList.add("solid");
    else if (o.handles !== false) ["a", "b", "c", "d"].forEach(function (c) { mk(box, "i", "hr-h " + c); });
    const tx = mk(box, "div", "hr-tx");
    if (o.fontSize) tx.style.fontSize = o.fontSize + "px";
    const typed = mk(tx, "span", "");
    const caret = mk(tx, "span", "hr-caret");
    // measure with the full line so the box never grows while typing
    typed.textContent = text;
    box.style.minHeight = box.offsetHeight + "px";
    const W = box.offsetWidth, H = box.offsetHeight;
    typed.textContent = "";
    gsap.set(box, { opacity: 0 });

    const drag = pick(o.drag, 0.5);
    let cur = null;
    if (drag > 0) {
      tl.set(box, { opacity: 1 }, at);
      tl.fromTo(box, { clipPath: "inset(-20px 100% 100% -20px)" }, { clipPath: "inset(-20px -20px -20px -20px)", duration: drag, ease: "power2.inOut", immediateRender: false }, at);
      if (o.cursor !== false && box.parentNode) {
        cur = svg(box.parentNode, "svg", { viewBox: "0 0 24 24", class: "hr-cursor" });
        cur.innerHTML = CURSOR_SVG;
        const x0 = box.offsetLeft - 10, y0 = box.offsetTop - 10;
        gsap.set(cur, { opacity: 0, x: x0, y: y0 });
        tl.set(cur, { opacity: 1 }, at - 0.15);
        tl.to(cur, { x: x0 + W, y: y0 + H, duration: drag, ease: "power2.inOut" }, at);
        tl.to(cur, { x: x0 + W + 80, y: y0 + H + 140, opacity: 0, duration: 0.4, ease: "power2.in" }, at + drag + 0.25);
      }
    } else {
      tl.fromTo(box, { opacity: 0, y: 40, scale: 0.97 }, { opacity: 1, y: 0, scale: 1, duration: 0.45, ease: "power3.out" }, at);
    }
    const t0 = at + Math.max(drag, 0.3) + 0.1;
    const t1 = t0 + pick(o.typeDur, Math.min(2.2, Math.max(0.6, text.length * 0.03)));
    const hold = pick(o.hold, 0.8);
    onFrame(tl, function (t) {
      const p = Math.max(0, Math.min(1, (t - t0) / (t1 - t0)));
      typed.textContent = text.slice(0, Math.round(p * text.length));
      caret.style.opacity = (t >= t0 && t <= t1) ? 1 : (Math.floor(t * 2.4) % 2 ? 0 : 1);
      if (o.caret === false) caret.style.opacity = 0;
    });
    return t1 + hold;
  }

  // =====================================================================
  // 2. blobWipe  (ayushfx six-petal blobs)
  //    mode "corners": two spinning blue blobs bloom in at the corners as decoration.
  //    mode "cover": one blob spins up to fill the frame (a wipe). Returns the time the
  //    frame is fully blue, so you can swap content under it.
  //    opts: mode, blobs [{x,y,size,spin}], hold (s before blobs leave), x/y (cover centre),
  //          color, out (true: cover blob shrinks away again after hold)
  // =====================================================================
  let BLOB_D = null;
  function blobPath() {
    if (BLOB_D) return BLOB_D;
    let d = "";
    const N = 360;
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * Math.PI * 2;
      const k = Math.pow((1 + Math.cos(6 * a)) / 2, 1.6);
      const r = 26 + 66 * k;
      d += (i ? " L " : "M ") + (r * Math.cos(a)).toFixed(2) + " " + (r * Math.sin(a)).toFixed(2);
    }
    BLOB_D = d + " Z";
    return BLOB_D;
  }
  function blobWipe(tl, target, at, o) {
    o = o || {};
    const box = el(target);
    const mode = o.mode || "corners";
    const make = function (b) {
      const s = svg(box, "svg", { viewBox: "-100 -100 200 200", class: "hr-blob" });
      s.style.left = b.x + "px"; s.style.top = b.y + "px";
      if (b.size) { s.style.width = b.size + "px"; s.style.height = b.size + "px"; }
      const p = svg(s, "path", { d: blobPath() });
      if (o.color) p.style.fill = o.color;
      gsap.set(s, { scale: 0, transformOrigin: "50% 50%" });
      return s;
    };
    if (mode === "cover") {
      const size = 760, cx = pick(o.x, 540), cy = pick(o.y, 960);
      const b = make({ x: cx - size / 2, y: cy - size / 2, size: size });
      const d = pick(o.d, 0.7);
      tl.to(b, { scale: pick(o.scale, 12), rotation: 120, duration: d, ease: "power3.in" }, at);
      if (o.out) tl.to(b, { scale: 0, rotation: 240, duration: 0.6, ease: "power3.out" }, at + d + pick(o.hold, 0.3));
      return at + d;
    }
    const list = o.blobs || [{ x: -330, y: -300, spin: 70 }, { x: 640, y: 1380, spin: -70 }];
    const hold = pick(o.hold, 3);
    const els = list.map(make);
    tl.to(els, { scale: 1, duration: 0.6, ease: "back.out(1.4)", stagger: 0.08 }, at);
    els.forEach(function (b, i) {
      tl.to(b, { rotation: "+=" + pick(list[i].spin, i % 2 ? -70 : 70), duration: hold + 0.35, ease: "none" }, at);
    });
    if (o.out !== false) tl.to(els, { scale: 0, duration: 0.35, ease: "power2.in" }, at + hold);
    return at + 0.6;
  }

  // =====================================================================
  // 3. ribbonSweep  (ayushfx blue band)
  //    A very thick blue stroke draws across the frame, can bend to a new shape, then
  //    wipes off. Put text above it (z-index) in white or ink.
  //    opts: d (path), width (stroke px), color, dur, to (second path, same command
  //          structure), toAt, outAt (time the band wipes off; omit to keep it)
  // =====================================================================
  function ribbonSweep(tl, target, at, o) {
    o = o || {};
    const box = el(target);
    const s = svg(box, "svg", { viewBox: "0 0 1080 1920", class: "hr-ribbon" });
    const p = svg(s, "path", { d: o.d || "M -260 470 C 250 900, 650 1230, 1340 1330", fill: "none", stroke: o.color || BLUE, "stroke-width": pick(o.width, 430), "stroke-linecap": "butt" });
    const L = Math.ceil(p.getTotalLength() + 50);
    gsap.set(p, { attr: { "stroke-dasharray": L, "stroke-dashoffset": L } });
    const dur = pick(o.dur, 0.6);
    tl.to(p, { attr: { "stroke-dashoffset": 0 }, duration: dur, ease: "power3.out" }, at);
    if (o.to) tl.to(p, { attr: { d: o.to }, duration: 0.55, ease: "power3.inOut" }, pick(o.toAt, at + dur + 0.6));
    if (o.outAt != null) tl.to(p, { attr: { "stroke-dashoffset": -L }, duration: 0.5, ease: "power2.in" }, o.outAt);
    return at + dur;
  }

  // =====================================================================
  // 4. underlineMorph  (ehabedit hook -> brand)
  //    A blue underline grows under one word, the line's other words blur away, the
  //    underline lifts off and becomes a square, then shrinks into a blue dot (the
  //    Headroom mark's dot, or any point you name).
  //    target: the word element (a span inside your headline)
  //    opts: others (selector/elements that leave), sq {x,y,size} (stage px, centre),
  //          dot {x,y,r} or false, layer (default: composition root)
  //    Positions are read when the move first plays, after fonts are in.
  // =====================================================================
  function underlineMorph(tl, target, at, o) {
    o = o || {};
    const word = el(target);
    const layer = o.layer ? el(o.layer) : layerOf(word);
    word.style.position = "relative";
    const ul = mk(word, "i", "hr-ul");
    const sq = mk(layer, "div", "hr-sq");
    const S = pick(o.sq && o.sq.size, 140);
    sq.style.width = S + "px"; sq.style.height = S + "px";
    const sx = pick(o.sq && o.sq.x, 540), sy = pick(o.sq && o.sq.y, 960);
    let R = null;
    const rect = function () { if (!R) R = relRect(ul, layer); return R; };

    tl.fromTo(ul, { scaleX: 0 }, { scaleX: 1, duration: 0.35, ease: "power2.out" }, at);
    if (o.others) tl.to(o.others, { opacity: 0, filter: "blur(10px)", duration: 0.3, stagger: 0.02, ease: "power2.in" }, at + 0.6);
    tl.to(word, { color: "rgba(22,27,38,0)", duration: 0.25, ease: "power2.in" }, at + 0.62);
    tl.set(sq, { opacity: 1 }, at + 0.88);
    tl.set(word, { opacity: 0 }, at + 0.89);
    tl.fromTo(sq,
      { x: function () { const r = rect(); return r.l + r.w / 2 - S / 2; }, y: function () { const r = rect(); return r.t + r.h / 2 - S / 2; },
        scaleX: function () { return rect().w / S; }, scaleY: function () { return rect().h / S; }, borderRadius: 2 },
      { x: sx - S / 2, y: sy - S / 2, scaleX: 1, scaleY: 1, borderRadius: 0, duration: 0.42, ease: "power3.inOut", immediateRender: false }, at + 0.89);
    if (o.dot === false) return at + 1.31;
    const dot = o.dot || { x: sx, y: sy, r: 24 };
    tl.to(sq, { x: dot.x - S / 2, y: dot.y - S / 2, scaleX: dot.r * 2 / S, scaleY: dot.r * 2 / S, borderRadius: S / 2, duration: 0.45, ease: "power3.inOut" }, at + 1.4);
    return at + 1.85;
  }

  // =====================================================================
  // 5. glyphStorm  (ehabedit hook background)
  //    Hundreds of code glyphs (/ \ # + < > ...) pop in and jitter behind a headline,
  //    leaving a clear band for the text, then blow outward and vanish.
  //    target: a full-frame layer behind the headline
  //    opts: count (300), seed, dur (s before it clears), clear {top,bottom} (stage px band
  //          kept faint), chars [], blue (share of blue glyphs, 0.16)
  // =====================================================================
  function glyphStorm(tl, target, at, o) {
    o = o || {};
    const box = el(target);
    box.classList.add("hr-storm");
    const rnd = rng(pick(o.seed, 3856429));
    const CH = o.chars || ["/", "\\", "#", "+", "<", ">", "!", "?", "*", "/", "\\", "#", "=", "[", "%", "@"];
    const n = pick(o.count, 300), dur = pick(o.dur, 3), blue = pick(o.blue, 0.16);
    const clear = o.clear || { top: 780, bottom: 1090 };
    const W = box.offsetWidth || 1080, H = box.offsetHeight || 1920;
    const G = [];
    for (let i = 0; i < n; i++) {
      const s = mk(box, "span", "");
      const x = 30 + rnd() * (W - 60), y = 120 + rnd() * (H - 240);
      const g = { el: s, x: x, y: y, t0: 0.15 + (dur - 0.5) * Math.sqrt(rnd()), ph: rnd() * 6.28, vx: (rnd() - 0.5) * 30, vy: (rnd() - 0.5) * 30, rot: (rnd() - 0.5) * 40 };
      s.textContent = CH[Math.floor(rnd() * CH.length)];
      s.style.fontSize = (34 + rnd() * 26).toFixed(1) + "px";
      s.style.color = rnd() < blue ? BLUE : INK;
      g.band = (y > clear.top && y < clear.bottom) ? 0.18 : 1;
      G.push(g);
    }
    const cx = W / 2, cy = H / 2;
    onFrame(tl, function (T) {
      const t = T - at;
      for (let i = 0; i < G.length; i++) {
        const g = G[i];
        let op = 0;
        if (t >= g.t0) op = Math.min(1, (t - g.t0) / 0.12);
        if (t > dur) op *= Math.max(0, 1 - (t - dur) / 0.45);
        const tc = Math.max(0, t);
        let x = g.x + g.vx * tc + Math.sin(tc * 7 + g.ph) * 5;
        let y = g.y + g.vy * tc + Math.cos(tc * 6 + g.ph) * 5;
        if (t > dur - 0.05) { const k = Math.pow(t - (dur - 0.05), 2) * 5; x += (g.x - cx) * k; y += (g.y - cy) * k; }
        g.el.style.opacity = (op * g.band).toFixed(3);
        g.el.style.transform = "translate(" + x.toFixed(1) + "px," + y.toFixed(1) + "px) rotate(" + g.rot + "deg)";
      }
    });
    return at + dur + 0.45;
  }

  // =====================================================================
  // 6. wordBuild  (every ad; karaoke from nocodealex, drop from ayushfx)
  //    Splits a line into words and builds it word by word.
  //    mode "blur"   : each word blurs up into place (default)
  //    mode "karaoke": all words sit pale grey, each turns ink as it is "said",
  //                    key words turn blue (needs opts.dur = how long the line takes)
  //    mode "drop"   : words drop in from alternating heights and tilt, then settle
  //    Words inside an element with class "blue" (or listed in keys) are key words.
  //    opts: mode, s (stagger), d, y, blur, keys ["word", ...], dur (karaoke)
  // =====================================================================
  function wordBuild(tl, target, at, o) {
    o = o || {};
    const root = el(target);
    const ws = split(root);
    const keys = (o.keys || []).map(function (k) { return k.toLowerCase(); });
    const isKey = function (w) {
      const bare = w.textContent.toLowerCase().replace(/[^a-z0-9$%+]/g, "");
      return !!w.closest(".blue") || keys.indexOf(bare) >= 0;
    };
    ws.forEach(function (w) { if (keys.length && isKey(w) && !w.closest(".blue")) w.style.color = BLUE; });
    const mode = o.mode || "blur";
    if (mode === "karaoke") {
      const dur = pick(o.dur, ws.length * 0.25);
      const lens = ws.map(function (w) { return w.textContent.length + 2; });
      const tot = lens.reduce(function (a, b) { return a + b; }, 0);
      let acc = 0;
      const times = lens.map(function (l) { const t = at + (acc / tot) * dur; acc += l; return t; });
      const key = ws.map(isKey);
      tl.fromTo(root, { opacity: 0 }, { opacity: 1, duration: 0.2 }, Math.max(0, at - 0.2));
      onFrame(tl, function (t) {
        for (let i = 0; i < ws.length; i++) ws[i].style.color = t >= times[i] ? (key[i] ? BLUE : INK) : GREY;
      });
      return at + dur;
    }
    if (mode === "drop") {
      const s = pick(o.s, 0.07);
      tl.fromTo(ws, { opacity: 0, y: function (i) { return i % 2 ? 90 : -90; }, rotation: function (i) { return i % 2 ? 6 : -6; } },
        { opacity: 1, y: 0, rotation: 0, duration: 0.35, ease: "back.out(2)", stagger: s }, at);
      return at + 0.35 + s * (ws.length - 1);
    }
    const s = pick(o.s, 0.12), d = pick(o.d, 0.35);
    tl.fromTo(ws, { opacity: 0, y: pick(o.y, 14), filter: "blur(" + pick(o.blur, 8) + "px)" },
      { opacity: 1, y: 0, filter: "blur(0px)", duration: d, stagger: s, ease: "power2.out" }, at);
    return at + d + s * (ws.length - 1);
  }

  // =====================================================================
  // 7. highlightSweep  (noahmgfx "remember." sheen)
  //    A light sheen runs through a blue word (gradient clipped to the text).
  //    target: the word span(s). opts: dur (0.9)
  // =====================================================================
  function highlightSweep(tl, target, at, o) {
    o = o || {};
    // the gradient must sit on the innermost text boxes: if wordBuild split the word, use its .hr-w spans
    let els = [];
    all(target).forEach(function (e) {
      const inner = e.querySelectorAll(".hr-w");
      if (inner.length) els = els.concat(Array.prototype.slice.call(inner)); else els.push(e);
    });
    els.forEach(function (e) { e.classList.add("hr-sweep"); });
    const dur = pick(o.dur, 0.9);
    tl.fromTo(els, { backgroundPosition: "100% 0" }, { backgroundPosition: "0% 0", duration: dur, ease: "power2.inOut", immediateRender: false }, at);
    return at + dur;
  }

  // =====================================================================
  // 8. splitFlap  (nocodealex $50,000 board)
  //    A departures-board number: digits spin, then land left to right and turn blue.
  //    opts: value ("$50,000"), spin (s of spinning before the first digit lands),
  //          step (s between landings), pulse (true)
  // =====================================================================
  function splitFlap(tl, target, at, o) {
    o = o || {};
    const box = el(target);
    box.classList.add("hr-flaps");
    const value = String(pick(o.value, "$50,000"));
    const spin = pick(o.spin, 0.45), step = pick(o.step, 0.25);
    const DIG = "0123456789";
    const cells = [];
    let k = 0;
    value.split("").forEach(function (ch) {
      const isDigit = DIG.indexOf(ch) >= 0;
      const isSep = ch === "," || ch === "." || ch === " ";
      const c = mk(box, "div", "hr-flap" + (isSep ? " sep" : ""));
      c.textContent = isDigit ? "0" : ch;
      cells.push({ el: c, ch: ch, digit: isDigit, sep: isSep, land: isDigit ? at + spin + (k++) * step : null });
    });
    const firstLand = at + spin, lastLand = at + spin + Math.max(0, k - 1) * step;
    onFrame(tl, function (t) {
      for (let i = 0; i < cells.length; i++) {
        const c = cells[i];
        if (c.sep) continue;
        if (!c.digit) { c.el.classList.toggle("on", t >= firstLand); continue; }
        if (t >= c.land) { c.el.textContent = c.ch; c.el.classList.add("on"); c.el.style.transform = "none"; }
        else if (t >= at) {
          const n = Math.floor(t * 24 + i * 3);
          c.el.textContent = DIG[n % 10]; c.el.classList.remove("on");
          c.el.style.transform = "scaleY(" + (0.75 + 0.25 * Math.abs(Math.cos(t * 75 + i))).toFixed(3) + ")";
        } else { c.el.textContent = "0"; c.el.classList.remove("on"); c.el.style.transform = "none"; }
      }
    });
    if (o.pulse !== false) tl.fromTo(box, { scale: 1 }, { scale: 1.06, duration: 0.16, yoyo: true, repeat: 1, ease: "power2.out", immediateRender: false }, lastLand + 0.15);
    return lastLand + 0.5;
  }

  // =====================================================================
  // 9. pileBurst  (noahmgfx ping pile-up)
  //    Notification cards stack up fast and jitter, then burst outward and blur away.
  //    target: a full-frame layer. opts: items [{icon:"S" or "path.svg", color, app,
  //    when, text, x, y}], stagger (0.12), hold (s from first card to burst),
  //    burst (true), cx/cy (burst centre)
  // =====================================================================
  function pileBurst(tl, target, at, o) {
    o = o || {};
    const box = el(target);
    const items = o.items || [
      { icon: "S", color: "#4a154b", app: "Slack", when: "now", text: "Where are we on the March report?" },
      { icon: "C", color: "#7b68ee", app: "ClickUp", when: "1m", text: "Approval needed: Q2 ad copy" },
      { icon: "G", color: "#ea4335", app: "Gmail", when: "2m", text: "Client: any update on this?" },
      { icon: "A", color: "#f06a6a", app: "Asana", when: "4m", text: "3 tasks overdue in Onboarding" },
      { icon: "S", color: "#4a154b", app: "Slack", when: "6m", text: "Can someone pull last week's numbers?" },
      { icon: "D", color: "#4285f4", app: "Docs", when: "9m", text: "New comment on Client Report v3" },
    ];
    const cx = pick(o.cx, 540), cy = pick(o.cy, 960);
    const st = pick(o.stagger, 0.12), hold = pick(o.hold, 2.4);
    const burstAt = at + hold;
    items.forEach(function (it, i) {
      const x = pick(it.x, (i % 2 ? 520 : 90) + ((i * 37) % 60)), y = pick(it.y, 520 + i * 150);
      const c = mk(box, "div", "hr-nc");
      c.style.left = x + "px"; c.style.top = y + "px";
      const icon = /\.(svg|png|jpg)$/i.test(it.icon || "") ? '<img src="' + it.icon + '" alt="" />' : (it.icon || "");
      c.innerHTML = '<div class="ic" style="background:' + (it.color || BLUE) + '">' + icon + '</div><div><div class="t">' + (it.app || "") + "<span>" + (it.when || "") + '</span></div><div class="s">' + (it.text || "") + '</div></div><i class="dot"></i>';
      const dx = (x + 235 - cx) * 0.9, dy = (y + 59 - cy) * 0.6;
      tl.fromTo(c, { opacity: 0, scale: 0.35, x: -dx * 0.6, y: -dy * 0.6, filter: "blur(10px)" },
        { opacity: 1, scale: 1, x: 0, y: 0, filter: "blur(0px)", duration: 0.45, ease: "back.out(1.6)" }, at + i * st);
      tl.to(c, { x: i % 2 ? 8 : -8, y: (i % 3) * 6 - 6, duration: Math.max(0.3, hold - 0.6 - i * st), ease: "sine.inOut" }, at + 0.5 + i * st);
      if (o.burst !== false) tl.to(c, { x: dx * 1.6, y: dy * 1.6, scale: 1.4, opacity: 0, filter: "blur(22px)", duration: 0.55, ease: "power2.in" }, burstAt + (i % 3) * 0.04);
    });
    return o.burst !== false ? burstAt + 0.6 : at + items.length * st + 0.45;
  }

  // =====================================================================
  // 10. orbGather  (noahmgfx "where the work lives" orb)
  //     A blue orb grows, source chips slide in with dashed lines to it, get pulled in,
  //     the orb pops, then flies to a spot (e.g. a card's header icon) and vanishes.
  //     target: a full-frame layer. opts: cx, cy (orb centre), chips [{label,x,y}]
  //     (x,y = chip centre), tag (small caps label under the orb), gather (s after `at`
  //     the chips are pulled in, 2.05), to {x,y,scale} or null (stay put)
  // =====================================================================
  function orbGather(tl, target, at, o) {
    o = o || {};
    const box = el(target);
    const cx = pick(o.cx, 540), cy = pick(o.cy, 1000);
    const chips = o.chips || [{ label: "Slack", x: 290, y: 620 }, { label: "Desktop app", x: 800, y: 760 }, { label: "Chrome extension", x: 330, y: 1400 }];
    const lines = svg(box, "svg", { viewBox: "0 0 1080 1920", class: "hr-lines" });
    const wrap = mk(box, "div", "hr-orbw");
    wrap.style.left = cx + "px"; wrap.style.top = cy + "px";
    const glow = mk(wrap, "div", "hr-orb-glow"), ring = mk(wrap, "div", "hr-orb-ring"), orb = mk(wrap, "div", "hr-orb");
    let tag = null;
    if (o.tag) { tag = mk(wrap, "div", "hr-orb-tag"); tag.textContent = o.tag; }
    const chipEls = [], lineEls = [];
    chips.forEach(function (c) {
      const ln = svg(lines, "path", { d: "M" + c.x + " " + c.y + " L" + cx + " " + cy, fill: "none", stroke: BLUE, "stroke-width": 3, "stroke-dasharray": "8 10", opacity: 0 });
      lineEls.push(ln);
      const d = mk(box, "div", "hr-chip", "<b></b>" + c.label);
      d.style.left = c.x + "px"; d.style.top = c.y + "px";
      gsap.set(d, { xPercent: -50, yPercent: -50 });
      chipEls.push(d);
    });
    tl.set(orb, { opacity: 1 }, at);
    tl.fromTo(orb, { scale: 0.04 }, { scale: 1, duration: 0.8, ease: "back.out(1.4)" }, at);
    tl.fromTo(glow, { opacity: 0, scale: 0.4 }, { opacity: 1, scale: 1, duration: 0.8, ease: "power2.out" }, at + 0.15);
    tl.fromTo(ring, { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.7, ease: "power2.out" }, at + 0.35);
    tl.to(glow, { scale: 1.15, duration: 0.5, yoyo: true, repeat: 3, ease: "sine.inOut" }, at + 1.0);
    if (tag) blurIn(tl, tag, at + 0.5, { d: 0.4 });
    chipEls.forEach(function (c, i) {
      tl.fromTo(c, { opacity: 0, x: chips[i].x < cx ? -160 : 160, filter: "blur(10px)" }, { opacity: 1, x: 0, filter: "blur(0px)", duration: 0.45, ease: "power3.out" }, at + 0.6 + i * 0.16);
    });
    tl.fromTo(lineEls, { attr: { "stroke-dashoffset": 120 }, opacity: 0 }, { attr: { "stroke-dashoffset": 0 }, opacity: 1, duration: 1.2, stagger: 0.14, ease: "none" }, at + 0.8);
    const g = at + pick(o.gather, 2.05);
    chipEls.forEach(function (c, i) {
      tl.to(c, { x: cx - chips[i].x, y: cy - chips[i].y, scale: 0.2, opacity: 0, filter: "blur(6px)", duration: 0.45, ease: "power3.in" }, g + i * 0.06);
    });
    tl.to(lineEls, { opacity: 0, duration: 0.3 }, g + 0.05);
    if (tag) blurOut(tl, tag, g, { d: 0.3 });
    tl.to(orb, { scale: 1.18, duration: 0.15, yoyo: true, repeat: 1, ease: "power2.out" }, g + 0.45);
    if (!o.to) return g + 0.75;
    tl.to(wrap, { x: o.to.x - cx, y: o.to.y - cy, scale: pick(o.to.scale, 0.16), duration: 0.55, ease: "power3.inOut" }, g + 0.6);
    tl.to(wrap, { opacity: 0, duration: 0.2 }, g + 1.05);
    return g + 1.15;
  }

  // =====================================================================
  // 11. agentTags  (noahmgfx repeat-work card)
  //     A white card unrolls with a list of repeat jobs and hour bars; then the top N
  //     rows tint blue, their bars turn blue and an "AI agent" tag pops on each.
  //     target: an empty block (give it width + position). opts: title, chip (right side
  //     of header, e.g. "SAMPLE"), rows [{name, v 0..1}], tagged (3), label ("AI agent"),
  //     tagAt (s after `at`)
  // =====================================================================
  function agentTags(tl, target, at, o) {
    o = o || {};
    const card = el(target);
    card.classList.add("hr-card");
    const rows = o.rows || [
      { name: "Monthly client reports", v: 1 }, { name: "Approval chasing", v: 0.84 }, { name: "\"Where are we?\" replies", v: 0.71 },
      { name: "Meeting notes to tasks", v: 0.52 }, { name: "Ad account pulls", v: 0.4 }, { name: "Client onboarding docs", v: 0.29 },
    ];
    const hd = mk(card, "div", "hd", "<i></i>");
    hd.appendChild(document.createTextNode(o.title || "Repeat work"));
    if (o.chip) { const sp = mk(hd, "span", ""); sp.textContent = o.chip; }
    const rowEls = rows.map(function (r) {
      const d = mk(card, "div", "hr-row", '<i class="tint"></i><div class="nm"></div><div class="ag"><i></i></div><div class="bar"><i></i></div>');
      d.querySelector(".nm").textContent = r.name;
      d.querySelector(".ag").appendChild(document.createTextNode(o.label || "AI agent"));
      d.querySelector(".bar i").style.width = Math.round(r.v * 100) + "%";
      return d;
    });
    tl.fromTo(card, { opacity: 0, y: 80, scale: 0.94, clipPath: "inset(0% 0% 100% 0% round 40px)" },
      { opacity: 1, y: 0, scale: 1, clipPath: "inset(0% 0% 0% 0% round 40px)", duration: 0.6, ease: "power3.out" }, at);
    rowEls.forEach(function (r, i) {
      const t = at + 0.3 + i * 0.12;
      tl.fromTo(r, { opacity: 0, x: -24 }, { opacity: 1, x: 0, duration: 0.3, ease: "power2.out" }, t);
      tl.to(r.querySelector(".bar i"), { scaleX: 1, duration: 0.5, ease: "power2.out" }, t + 0.1);
    });
    const tagAt = at + pick(o.tagAt, 0.3 + rows.length * 0.12 + 0.6);
    const n = Math.min(pick(o.tagged, 3), rowEls.length);
    rowEls.slice(0, n).forEach(function (r, i) {
      const t = tagAt + i * 0.2;
      tl.to(r.querySelector(".tint"), { opacity: 1, duration: 0.3 }, t);
      tl.to(r.querySelector(".bar i"), { backgroundColor: BLUE, duration: 0.3 }, t);
      tl.to(r.querySelector(".ag"), { scale: 1, duration: 0.3, ease: "back.out(2.2)" }, t + 0.05);
    });
    return tagAt + n * 0.2 + 0.35;
  }

  // =====================================================================
  // 12. stampSlam  (borja "A GUESS" / "NOTHING CHANGED")
  //     A rubber-stamp label slams down from big to size at a tilt; the thing under it
  //     jolts. opts: text, x, y (left/top inside target), rotate (-8), shake (element)
  // =====================================================================
  function stampSlam(tl, target, at, o) {
    o = o || {};
    const box = el(target);
    const s = mk(box, "div", "hr-stamp");
    s.textContent = o.text || "A GUESS";
    s.style.left = pick(o.x, 300) + "px"; s.style.top = pick(o.y, 900) + "px";
    const r = pick(o.rotate, -8);
    tl.fromTo(s, { opacity: 0, scale: 1.8, rotation: r }, { opacity: 1, scale: 1, rotation: r, duration: 0.28, ease: "power4.in" }, at);
    if (o.shake) tl.fromTo(o.shake, { x: 0 }, { x: 8, duration: 0.04, yoyo: true, repeat: 5, ease: "none", immediateRender: false }, at + 0.28);
    return at + 0.5;
  }

  // =====================================================================
  // 13. ringCountdown  (divyansh 45 -> 5 ring)
  //     A blue ring closes, then drains while the number counts down (or up) to the
  //     end value; the number turns blue and pops.
  //     target: empty block (the move sizes it). opts: from (45), to (5), unit ("hours"),
  //     size (500), stroke (26), dur (count s, 1.2), numSize (200)
  // =====================================================================
  function ringCountdown(tl, target, at, o) {
    o = o || {};
    const box = el(target);
    box.classList.add("hr-ringbox");
    const size = pick(o.size, 500), sw = pick(o.stroke, 26), r = size / 2;
    box.style.width = size + "px"; box.style.height = size + "px";
    const from = pick(o.from, 45), to = pick(o.to, 5), dur = pick(o.dur, 1.2), ns = pick(o.numSize, 200);
    const s = svg(box, "svg", { viewBox: "0 0 " + size + " " + size, width: size, height: size });
    svg(s, "circle", { cx: r, cy: r, r: r - sw / 2, fill: "none", stroke: "#e3e6eb", "stroke-width": sw });
    const fg = svg(s, "circle", { cx: r, cy: r, r: r - sw / 2, fill: "none", stroke: BLUE, "stroke-width": sw, "stroke-linecap": "round", pathLength: 1, "stroke-dasharray": 1, "stroke-dashoffset": 1, transform: "rotate(-90 " + r + " " + r + ")" });
    const num = mk(box, "div", "hr-ringnum");
    num.style.fontSize = ns + "px"; num.style.top = (r - ns * 0.62) + "px";
    const unit = mk(box, "div", "hr-ringunit");
    unit.textContent = o.unit == null ? "hours" : o.unit;
    unit.style.top = (r + ns * 0.42) + "px";
    const ctr = { v: from };
    gsap.set(num, { color: INK, scale: 1 });
    tl.fromTo(box, { opacity: 0, scale: 0.85, filter: "blur(12px)" }, { opacity: 1, scale: 1, filter: "blur(0px)", duration: 0.45, ease: "power3.out" }, at - 0.05);
    tl.to(fg, { attr: { "stroke-dashoffset": 0 }, duration: 0.45, ease: "power2.out" }, at);
    tl.to(fg, { attr: { "stroke-dashoffset": 1 - Math.max(0.02, Math.min(1, to / from)) }, duration: dur, ease: "power2.inOut" }, at + 0.5);
    tl.fromTo(ctr, { v: from }, { v: to, duration: dur, ease: "power2.inOut", immediateRender: false }, at + 0.5);
    onFrame(tl, function () { num.textContent = Math.round(ctr.v); });
    tl.to(num, { color: BLUE, duration: 0.3 }, at + 0.5 + dur - 0.05);
    tl.to(num, { scale: 1.1, duration: 0.16, yoyo: true, repeat: 1 }, at + 0.5 + dur);
    return at + 0.5 + dur + 0.35;
  }

  // =====================================================================
  // 14. chapterHud  (borja chapter frame)
  //     Viewfinder corners, a HEADROOM label top left, the chapter name top right, and a
  //     thin progress line along the bottom that fills over the whole ad.
  //     target: full-frame layer on top. opts: label ("HEADROOM"), chapters [[time, "01 MEASURE"]],
  //     dur (s the progress line takes, usually the ad length), color (for blue scenes: "#fff")
  // =====================================================================
  function chapterHud(tl, target, at, o) {
    o = o || {};
    const hud = el(target);
    hud.classList.add("hr-hud");
    if (o.color) hud.style.color = o.color;
    ["tl", "tr", "bl", "br"].forEach(function (c) { mk(hud, "div", "c " + c); });
    const l = mk(hud, "div", "lab l"); l.textContent = o.label || "HEADROOM";
    const r = mk(hud, "div", "lab r");
    const prog = mk(hud, "div", "prog"); const fill = mk(prog, "i", "");
    const dur = pick(o.dur, 10);
    tl.fromTo(hud, { opacity: 0 }, { opacity: 1, duration: 0.3 }, at);
    tl.fromTo(fill, { scaleX: 0 }, { scaleX: 1, duration: dur, ease: "none" }, at);
    const ch = o.chapters || [];
    const spans = ch.map(function (c) { const s = mk(r, "span", ""); s.textContent = c[1]; return s; });
    ch.forEach(function (c, i) {
      spans.forEach(function (s, j) { if (j !== i) tl.set(s, { opacity: 0 }, c[0]); });
      tl.fromTo(spans[i], { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.25, ease: "power2.out", immediateRender: false }, c[0]);
    });
    return at + dur;
  }

  // =====================================================================
  // 15. endCard  (standard Headroom end card; circle reveal from ehabedit)
  //     Builds the locked end card: mark, "headroom by Aalpha", the guarantee row
  //     "40+ hours a week back by day 90, / or we work for free." and a "Book a call" pill.
  //     target: a full-frame layer (gets the page background).
  //     opts: reveal ("fade" | "circle"), cx/cy (circle centre), cta ("Book a call")
  //     Copy is fixed on purpose (Black Card guarantee row, Salman 2026-11-02).
  // =====================================================================
  function endCard(tl, target, at, o) {
    o = o || {};
    const layer = el(target);
    layer.classList.add("hr-reveal");
    const end = mk(layer, "div", "hr-end");
    const m = svg(end, "svg", { viewBox: "0 0 32 32", class: "mark" });
    m.innerHTML = MARK_SVG;
    const word = mk(end, "div", "word", "headroom<span>by Aalpha</span>");
    const g = mk(end, "div", "g", "40+ hours a week back by day 90,<br /><span>or we work for free.</span>");
    const pw = mk(end, "div", "");
    const pill = mk(pw, "div", "pill"); pill.textContent = o.cta || "Book a call";
    const path = m.querySelector("path"), dot = m.querySelector("circle");
    // opacity 0 until it draws: a round cap on a zero-length dash still paints a dot
    gsap.set(path, { opacity: 0, attr: { "stroke-dasharray": 1, "stroke-dashoffset": 1 } });
    gsap.set(dot, { scale: 0, transformOrigin: "50% 50%" });
    if (o.reveal === "circle") {
      const cx = pick(o.cx, 540), cy = pick(o.cy, 925);
      tl.set(layer, { opacity: 1 }, at); // template hides #end with opacity:0; the circle reveal must undo it
      tl.fromTo(layer, { clipPath: "circle(0px at " + cx + "px " + cy + "px)" }, { clipPath: "circle(1300px at " + cx + "px " + cy + "px)", duration: 0.7, ease: "power3.in" }, at);
      at += 0.35;
    } else {
      tl.fromTo(layer, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: "power1.out" }, at);
    }
    tl.set(path, { opacity: 1 }, at + 0.1);
    tl.to(path, { attr: { "stroke-dashoffset": 0 }, duration: 0.6, ease: "power2.inOut" }, at + 0.1);
    tl.to(dot, { scale: 1, duration: 0.3, ease: "back.out(3)" }, at + 0.55);
    blurIn(tl, [word, g, pw], at + 0.35, { d: 0.5, s: 0.25, y: 24 });
    tl.fromTo(pill, { scale: 1 }, { scale: 1.06, duration: 0.25, yoyo: true, repeat: 1, ease: "power2.inOut", immediateRender: false }, at + 1.6);
    return at + 2.1;
  }

  // ---------- from IG Visual Library (AAL-16) ----------

  // wordFlips (yp.motionstudio): one word or short phrase per beat, hard cut, the background flips
  // between two colours and the word takes the opposite one. Cuts can speed up like the source.
  // o.beats: [{ text, d, bg: "blue"|"page", in: "slide"|"slideR"|"pop"|null, echo: bool, size }]
  // Builds a full-frame layer inside target (give target position:absolute; inset:0).
  function wordFlips(tl, target, at, o) {
    o = o || {};
    const root = el(target);
    const A = pick(o.blue, BLUE), P = pick(o.page, "#f6f7f9");
    const bg = mk(root, "div", "hr-flipbg");
    let t = at;
    o.beats.forEach(function (b) {
      const onB = b.bg !== "page";
      const w = mk(root, "div", "hr-flip " + (onB ? "hr-onB" : "hr-onP"));
      const size = pick(b.size, pick(o.size, 150));
      if (b.echo) {
        const e = mk(w, "div", "hr-flip-echo", b.text);
        e.style.fontSize = size + "px";
        tl.fromTo(e, { scale: 1.28, opacity: 0.75 }, { scale: 1.02, opacity: 0.3, duration: Math.min(0.6, b.d), ease: "power2.out" }, t);
      }
      const tx = mk(w, "div", "hr-flip-t", b.text);
      tx.style.fontSize = size + "px";
      gsap.set(w, { opacity: 0 });
      tl.set(w, { opacity: 1 }, t);
      tl.set(w, { opacity: 0 }, t + b.d);
      tl.set(bg, { backgroundColor: onB ? A : P }, t);
      if (b.in === "slide" || b.in === "slideR") {
        const dir = b.in === "slide" ? -1 : 1;
        tl.fromTo(tx, { x: dir * 420, skewX: dir * 24, filter: "blur(16px)" }, { x: 0, skewX: 0, filter: "blur(0px)", duration: Math.min(0.32, b.d), ease: "expo.out" }, t);
      } else if (b.in === "pop") {
        tl.fromTo(tx, { scale: 1.08 }, { scale: 1, duration: Math.min(0.5, b.d), ease: "power3.out" }, t);
      }
      t += b.d;
    });
    gsap.set(bg, { opacity: 0, backgroundColor: o.beats[0].bg !== "page" ? A : P });
    tl.set(bg, { opacity: 1 }, at);
    tl.set(bg, { opacity: 0 }, t);
    return t;
  }

  // stackSlam (yp.motionstudio): small line types in with a caret, one BIG word slams down,
  // small line rises in under it. o: { top, big, bottom, bigSize, smallSize, color, bg }
  // bg paints a full-frame background behind it (e.g. "#f6f7f9"); hide the target yourself when done.
  function stackSlam(tl, target, at, o) {
    o = o || {};
    const root = mk(el(target), "div", "hr-stack");
    if (o.bg) root.style.background = o.bg;
    gsap.set(root, { opacity: 0 });
    tl.set(root, { opacity: 1 }, at);
    const top = mk(root, "div", "hr-stack-sm");
    const typed = mk(top, "span", "");
    const caret = mk(top, "span", "hr-caret-b");
    const big = mk(root, "div", "hr-stack-xl", o.big);
    const bot = o.bottom ? mk(root, "div", "hr-stack-sm", o.bottom) : null;
    if (o.bigSize) big.style.fontSize = o.bigSize + "px";
    if (o.smallSize) { top.style.fontSize = o.smallSize + "px"; if (bot) bot.style.fontSize = o.smallSize + "px"; }
    if (o.color) big.style.color = o.color;
    const full = o.top || "";
    const step = pick(o.typeStep, 0.022);
    tl.set(typed, { textContent: "" }, at);
    for (let i = 1; i <= full.length; i++) tl.set(typed, { textContent: full.slice(0, i) }, at + i * step);
    let t = at + full.length * step + 0.06;
    tl.set(caret, { opacity: 0 }, t);
    tl.fromTo(big, { scale: 1.6, opacity: 0, filter: "blur(14px)" }, { scale: 1, opacity: 1, filter: "blur(0px)", duration: 0.22, ease: "power4.out" }, t);
    t += pick(o.gap, 0.25);
    if (bot) tl.fromTo(bot, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.25, ease: "power3.out" }, t);
    return t + 0.25;
  }

  // lightSmear (yp.motionstudio): a soft white wavy glow sweeps across the frame, left to right.
  // Use it as a transition over a colour bleed. o: { d, opacity }
  function lightSmear(tl, target, at, o) {
    o = o || {};
    const root = mk(el(target), "div", "hr-smear");
    [[120, -100, 260, 900], [40, 700, 340, 700], [160, 1300, 240, 800]].forEach(function (b) {
      const i = mk(root, "i", "");
      i.style.left = b[0] + "px"; i.style.top = b[1] + "px"; i.style.width = b[2] + "px"; i.style.height = b[3] + "px";
    });
    const d = pick(o.d, 0.6);
    gsap.set(root, { opacity: 0 });
    tl.set(root, { opacity: pick(o.opacity, 0.9) }, at);
    tl.fromTo(root, { x: -620 }, { x: 1180, duration: d, ease: "power1.inOut" }, at);
    tl.set(root, { opacity: 0 }, at + d + 0.02);
    return at + d;
  }

  window.HRMoves = {
    // helpers
    rng: rng, onFrame: onFrame, split: split, blurIn: blurIn, blurOut: blurOut,
    // moves
    typeBox: typeBox, blobWipe: blobWipe, ribbonSweep: ribbonSweep, underlineMorph: underlineMorph,
    glyphStorm: glyphStorm, wordBuild: wordBuild, highlightSweep: highlightSweep, splitFlap: splitFlap,
    pileBurst: pileBurst, orbGather: orbGather, agentTags: agentTags, stampSlam: stampSlam,
    ringCountdown: ringCountdown, chapterHud: chapterHud, endCard: endCard,
    wordFlips: wordFlips, stackSlam: stackSlam, lightSmear: lightSmear,
  };
})();
