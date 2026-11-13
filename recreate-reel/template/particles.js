// ParticleMorph (moves library, from the neuronvisuals recreate, AAL-16, Salman OK'd 2026-11-02): one particle system that morphs from 3D form to form.
// Every frame is a pure function of t (seek-safe): position = blend of the shape at the previous key
// and the shape at the next key, with a per-particle stagger so the morph ripples instead of snapping.
// Shapes return [x, y, z, alpha, blue, size] in world px around (0,0,0).
(function () {
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const clamp = (x) => Math.max(0, Math.min(1, x));
  const easeIO = (x) => { x = clamp(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
  const lerp = (a, b, e) => a + (b - a) * e;

  function ParticleMorph(opts) {
    const N = opts.n || 2400;
    const ctx = opts.canvas.getContext("2d");
    const W = opts.canvas.width, H = opts.canvas.height;
    const CX = opts.cx || W / 2, CY = opts.cy || H / 2, F = opts.focal || 1600;
    const R = mulberry32(opts.seed || 11);
    const ra = [], rb = [], rc = [], rd = [];
    for (let i = 0; i < N; i++) { ra.push(R()); rb.push(R()); rc.push(R()); rd.push(R()); }
    const INK = opts.ink || "22,27,38", BLUE = opts.blue || "42,120,214";
    const shapes = opts.shapes;       // { name: function (i, t, p, rnd) -> [x,y,z,a,b,s] }
    const keys = opts.keys;           // [{ t, s, p:{}, rx, spin, tr }] sorted by t
    const out = new Array(6);

    function camAt(t) {
      let k = 0; while (k < keys.length - 1 && keys[k + 1].t <= t) k++;
      const A = keys[k], B = keys[Math.min(k + 1, keys.length - 1)];
      const tr = B.tr || 1.4;
      const e = B === A ? 0 : easeIO((t - (B.t - tr)) / tr);
      return { k: k, A: A, B: B, e: e, tr: tr, rx: lerp(A.rx || 0, B.rx || 0, e) };
    }

    // world point -> screen, using the camera at time t
    function project(x, y, z, cam, t) {
      const ry = (opts.spin || 0.12) * t;
      const cy = Math.cos(ry), sy = Math.sin(ry);
      let x1 = x * cy - z * sy, z1 = x * sy + z * cy;
      const cr = Math.cos(cam.rx), sr = Math.sin(cam.rx);
      let y2 = y * cr - z1 * sr, z2 = y * sr + z1 * cr;
      const s = F / (F + z2);
      return [CX + x1 * s, CY + y2 * s, s, z2];
    }

    function particle(i, t, cam) {
      const rnd = [ra[i], rb[i], rc[i], rd[i]];
      const a = shapes[cam.A.s](i, t, cam.A.p || {}, rnd, N);
      if (cam.e <= 0) return a;
      const b = shapes[cam.B.s](i, t, cam.B.p || {}, rnd, N);
      // stagger: each particle starts its trip at a slightly different moment
      const st = ra[i] * 0.35;
      const e = easeIO((cam.e - st) / (1 - st));
      for (let j = 0; j < 6; j++) out[j] = lerp(a[j], b[j], e);
      return out;
    }

    function draw(t) {
      ctx.clearRect(0, 0, W, H);
      const cam = camAt(t);
      const hi = [];
      for (let i = 0; i < N; i++) {
        const q = particle(i, t, cam);
        if (q[3] <= 0.01) continue;
        const p = project(q[0], q[1], q[2], cam, t);
        if (p[2] <= 0) continue;
        if (q[4] > 0.5 || q[5] > 3.5) { hi.push([p[0], p[1], p[2], q[3], q[4], q[5]]); continue; }
        ctx.fillStyle = "rgba(" + (q[4] > 0.05 ? BLUE : INK) + "," + (q[3] * clamp(p[2] * 0.95)).toFixed(3) + ")";
        const r = Math.max(0.6, (q[5] || 2.2) * p[2]);
        ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, 6.2832); ctx.fill();
      }
      // highlighted particles on top, with a soft blue halo
      hi.forEach(function (h) {
        const r = Math.max(1, h[5] * h[2]);
        if (h[4] > 0.5) {
          const g = ctx.createRadialGradient(h[0], h[1], 0, h[0], h[1], r * 4);
          g.addColorStop(0, "rgba(" + BLUE + "," + (0.35 * h[3]).toFixed(3) + ")");
          g.addColorStop(1, "rgba(" + BLUE + ",0)");
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(h[0], h[1], r * 4, 0, 6.2832); ctx.fill();
        }
        ctx.fillStyle = "rgba(" + (h[4] > 0.5 ? BLUE : INK) + "," + h[3].toFixed(3) + ")";
        ctx.beginPath(); ctx.arc(h[0], h[1], r, 0, 6.2832); ctx.fill();
      });
      if (opts.after) opts.after(ctx, t, cam, project);
    }

    return { draw: draw, project: project, camAt: camAt };
  }


  // ---- built-in shapes (from the neuronvisuals ad). ParticleMorph.shapes({ tasks }) returns them.
  // tasks: [[x, z, height], ...] repeat jobs that rise as spikes on the plane; the first three are "the biggest".
  ParticleMorph.shapes = function (o) {
    o = o || {};
    const TAU = Math.PI * 2;
    const TASKS = o.tasks || [[-190, -90, 300], [90, -30, 400], [230, 120, 240], [-60, 150, 170], [-270, 140, 120]];
    const SIG2 = 2 * 48 * 48;
    function fib(i, N, r) {
      const k = i + 0.5, phi = Math.acos(1 - 2 * k / N), th = Math.PI * (1 + Math.sqrt(5)) * k;
      return [r * Math.cos(th) * Math.sin(phi), r * Math.cos(phi), r * Math.sin(th) * Math.sin(phi)];
    }
    function planeH(x, z, p, only3) {
      let h = 0;
      for (let k = 0; k < (only3 ? 3 : TASKS.length); k++) {
        const T = TASKS[k], d = (x - T[0]) * (x - T[0]) + (z - T[1]) * (z - T[1]);
        h += T[2] * Math.exp(-d / SIG2);
      }
      return h * (p.spike || 0);
    }

    return {
      // work cluster inside three dashed rings
      orbit: function (i, t, p, r, N) {
        if (i < 800) {
        const rr = 120 * Math.cbrt(r[0]), th = r[1] * TAU, ph = Math.acos(2 * r[2] - 1);
        return [rr * Math.sin(ph) * Math.cos(th), rr * Math.cos(ph), rr * Math.sin(ph) * Math.sin(th), 0.8, 0, 2.0];
        }
        const j = i - 800, k = j % 3, rad = [210, 295, 380][k];
        const ang = (j / (N - 800)) * TAU + k * 0.7 + (k % 2 ? -1 : 1) * t * 0.35;
        const a = Math.sin(ang * (14 + k * 6)) > -0.3 ? 0.55 : 0;
        return [rad * Math.cos(ang), rad * Math.sin(ang), 0, a, 0, 1.8];
      },
      // four remembered jobs, everything else faint on the floor ring
      remember: function (i, t, p, r, N) {
        if (i < 4) return [(i % 2 ? 1 : -1) * 60, 0, (i < 2 ? 1 : -1) * 60, 1, 1, 9];
        const ang = (i / N) * TAU, rad = 330 + r[1] * 60;
        return [rad * Math.cos(ang), (r[2] - 0.5) * 20, rad * Math.sin(ang), 0.2, 0, 1.6];
      },
      sphereLoose: function (i, t, p, r, N) {
        const q = fib(i, N, 330 * (0.55 + 0.9 * r[1]));
        return [q[0], q[1], q[2], 0.45, 0, 2.0];
      },
      sphere: function (i, t, p, r, N) {
        const q = fib(i, N, 330);
        return [q[0], q[1], q[2], 0.72, 0, 2.1];
      },
      // the week as a dot plane; repeat jobs rise as spikes; top three go blue
      plane: function (i, t, p, r, N) {
        const col = i % 60, row = Math.floor(i / 60);
        const x = -380 + col * (760 / 59), z = -260 + row * (520 / 39);
        const h = planeH(x, z, p, false);
        const wave = (p.wave || 0) * 16 * Math.sin(x * 0.012 + t * 1.6) * Math.cos(z * 0.01);
        let b = 0;
        if (p.blue3) for (let k = 0; k < 3; k++) {
        const T = TASKS[k], d = (x - T[0]) * (x - T[0]) + (z - T[1]) * (z - T[1]);
        if (T[2] * Math.exp(-d / SIG2) > 70) b = p.blue3;
        }
        return [x, -h + wave, z, 0.42 + 0.5 * Math.min(1, h / 300), b * 0.4, 2.0 + b * 0.6];
      },
      // agents: 44 live (blue, the core), 15 queued (pale blue), the rest faint
      disk: function (i, t, p, r, N) {
        const rad = 440 * Math.sqrt((i + 0.5) / N), ang = i * 2.39996 + t * 0.15;
        const L = p.live || 0;
        // live agents spread through the team (every 20th dot in the inner disk), queued between them
        if (i < 880 && i % 20 === 0) return [rad * Math.cos(ang), 0, rad * Math.sin(ang), 0.5 + 0.5 * L, L, 2 + 5 * L];
        if (i < 300 && i % 20 === 10) return [rad * Math.cos(ang), 0, rad * Math.sin(ang), 0.5 + 0.4 * L, 0.3 * L, 2 + 2.6 * L];
        return [rad * Math.cos(ang), 0, rad * Math.sin(ang), 0.5 - 0.22 * L, 0, 1.9];
      },
      point: function (i, t, p, r, N) {
        return [0, 0, 0, i === 0 ? 1 : 0, 1, 12];
      },
    };

  };

  window.ParticleMorph = ParticleMorph;
})();
