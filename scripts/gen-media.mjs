/**
 * Génère les visuels de remplacement (« Exemple ») de la médiathèque dans public/media/.
 * Images procédurales : dégradés + silhouettes, aucun contenu protégé.
 * Usage : node scripts/gen-media.mjs
 */
import zlib from "node:zlib";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public", "media");

/* ───────── PNG minimal ───────── */
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const out = Buffer.alloc(8 + data.length + 4);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
};
const writePng = (file, w, h, rgb) => {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0;
    for (let x = 0; x < w * 3; x++) raw[y * (w * 3 + 1) + 1 + x] = Math.max(0, Math.min(255, Math.round(rgb[y * w * 3 + x])));
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 2;
  fs.writeFileSync(file, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]));
};

/* ───────── Peintre ───────── */
const mulberry32 = (a) => () => {
  a |= 0; a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const lerp = (a, b, t) => a + (b - a) * t;
const mix = (c1, c2, t) => [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];
const GOLD = [201, 162, 39], GOLD_L = [229, 193, 88], GOLD_P = [243, 217, 130];

function canvas(w, h) {
  const px = new Float32Array(w * h * 3);
  const each = (fn) => { for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) fn(x, y, (y * w + x) * 3); };
  const gradY = (stops) => each((x, y, i) => {
    const t = y / (h - 1);
    let s = 0;
    while (s < stops.length - 2 && t > stops[s + 1][0]) s++;
    const [t0, c0] = stops[s], [t1, c1] = stops[s + 1];
    const k = Math.max(0, Math.min(1, (t - t0) / (t1 - t0 || 1)));
    const c = mix(c0, c1, k * k * (3 - 2 * k));
    px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2];
  });
  const add = (x, y, c, a) => {
    const i = (y * w + x) * 3;
    px[i] += c[0] * a; px[i + 1] += c[1] * a; px[i + 2] += c[2] * a;
  };
  const blend = (x, y, c, a) => {
    const i = (y * w + x) * 3;
    px[i] = lerp(px[i], c[0], a); px[i + 1] = lerp(px[i + 1], c[1], a); px[i + 2] = lerp(px[i + 2], c[2], a);
  };
  const glow = (cx, cy, r, c, intensity = 1, pow = 2.2) => {
    const x0 = Math.max(0, Math.floor(cx - r)), x1 = Math.min(w - 1, Math.ceil(cx + r));
    const y0 = Math.max(0, Math.floor(cy - r)), y1 = Math.min(h - 1, Math.ceil(cy + r));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const d = Math.hypot(x - cx, y - cy) / r;
      if (d < 1) add(x, y, c, intensity * Math.pow(1 - d, pow));
    }
  };
  const ellipse = (cx, cy, rx, ry, c, a, soft = 0.5) => {
    const x0 = Math.max(0, Math.floor(cx - rx * 1.6)), x1 = Math.min(w - 1, Math.ceil(cx + rx * 1.6));
    const y0 = Math.max(0, Math.floor(cy - ry * 1.6)), y1 = Math.min(h - 1, Math.ceil(cy + ry * 1.6));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const d = Math.hypot((x - cx) / rx, (y - cy) / ry);
      if (d < 1.6) blend(x, y, c, a * Math.max(0, Math.min(1, (1.6 - d) / (1.6 - soft)) ) * (d < soft ? 1 : 1));
    }
  };
  const rect = (x0, y0, x1, y1, c, a = 1) => {
    for (let y = Math.max(0, y0 | 0); y < Math.min(h, y1); y++)
      for (let x = Math.max(0, x0 | 0); x < Math.min(w, x1); x++) blend(x, y, c, a);
  };
  const beam = (cx, topW, botW, y0, y1, c, a) => {
    for (let y = Math.max(0, y0 | 0); y < Math.min(h, y1); y++) {
      const t = (y - y0) / (y1 - y0);
      const hw = lerp(topW, botW, t) / 2;
      const x0 = Math.max(0, Math.floor(cx - hw)), x1 = Math.min(w - 1, Math.ceil(cx + hw));
      for (let x = x0; x <= x1; x++) {
        const e = 1 - Math.abs(x - cx) / hw;
        add(x, y, c, a * e * e * (1 - t * 0.55));
      }
    }
  };
  const noise = (rng, amp) => each((x, y, i) => {
    const n = (rng() - 0.5) * 2 * amp;
    px[i] += n; px[i + 1] += n; px[i + 2] += n;
  });
  const vignette = (strength = 0.35) => each((x, y, i) => {
    const dx = (x / w - 0.5) * 1.3, dy = (y / h - 0.5) * 1.3;
    const v = Math.max(0, 1 - (dx * dx + dy * dy) * strength);
    px[i] *= v; px[i + 1] *= v; px[i + 2] *= v;
  });
  return { px, each, gradY, add, blend, glow, ellipse, rect, beam, noise, vignette };
}

const dot = (cv, x, y, r, c, a) => cv.ellipse(x, y, r, r, c, a, 0.9);

/* ───────── Scènes ───────── */
function campus(w, h, seed, dusk = 0) {
  const rng = mulberry32(seed);
  const cv = canvas(w, h);
  const sky = dusk
    ? [[0, [14, 18, 44]], [0.45, [74, 52, 88]], [0.72, [168, 96, 58]], [1, [228, 168, 92]]]
    : [[0, [18, 62, 122]], [0.5, [66, 126, 190]], [0.75, [158, 200, 236]], [1, [222, 240, 250]]];
  cv.gradY(sky);
  cv.glow(w * (0.62 + rng() * 0.2), h * 0.16, w * 0.3, dusk ? GOLD_P : [255, 244, 214], 0.85, 2.6);
  // nuages
  for (let i = 0; i < 16; i++) {
    const cx = rng() * w, cy = h * (0.06 + rng() * 0.4), s = w * (0.05 + rng() * 0.1);
    const shade = dusk ? [46, 34, 62] : [238, 246, 252];
    cv.ellipse(cx, cy, s * (1.4 + rng()), s * 0.4, shade, 0.35 + rng() * 0.4);
    cv.ellipse(cx + s * 0.5, cy + s * 0.14, s * 0.9, s * 0.3, shade, 0.3);
  }
  // ligne d'arbres au loin
  for (let x = 0; x < w; x += 4) {
    const yH = h * 0.72 + Math.sin(x * 0.02 + seed) * h * 0.01 + rng() * h * 0.012;
    cv.rect(x, yH, x + 4, h * 0.78, [18, 46, 30], 0.9);
  }
  // pelouse + allée
  cv.rect(0, h * 0.78, w, h, dusk ? [26, 40, 26] : [52, 110, 62], 1);
  for (let i = 0; i < 40; i++) cv.rect(rng() * w, h * (0.8 + rng() * 0.18), rng() * w, h * (0.82 + rng() * 0.16), [34, 74, 42], 0.25);
  cv.rect(w * 0.32, h * 0.8, w * 0.68, h, dusk ? [88, 66, 52] : [168, 152, 132], 1); // allée centrale
  cv.rect(w * 0.36, h * 0.82, w * 0.64, h, dusk ? [70, 52, 42] : [140, 126, 110], 0.5);
  // bâtiment moderne blanc (corps + aile)
  const bx = w * 0.3, by = h * 0.34, bw = w * 0.56, bh = h * 0.46;
  cv.rect(bx - bw * 0.34, by + bh * 0.28, bx, by + bh, dusk ? [56, 52, 62] : [214, 222, 228], 1); // aile gauche
  cv.rect(bx, by, bx + bw, by + bh, dusk ? [70, 66, 76] : [236, 240, 244], 1);
  cv.rect(bx, by, bx + bw, by + bh * 0.1, dusk ? [96, 90, 100] : [250, 252, 254], 1); // toit clair
  for (let f = 0; f < 4; f++) { // bandeaux de fenêtres
    const fy = by + bh * (0.16 + f * 0.21), fh = bh * 0.13;
    for (let cxn = bx + bw * 0.03; cxn < bx + bw * 0.97; cxn += bw * 0.045) {
      const lit = rng() < 0.24;
      const col = lit ? (dusk ? GOLD_P : [255, 230, 150]) : dusk ? [34, 40, 66] : [74, 118, 158];
      cv.rect(cxn, fy, cxn + bw * 0.036, fy + fh, col, 0.92);
    }
  }
  for (let cxn = bx - bw * 0.32; cxn < bx - bw * 0.02; cxn += bw * 0.05) { // fenêtres aile
    for (let f = 0; f < 2; f++) cv.rect(cxn, by + bh * (0.4 + f * 0.24), cxn + bw * 0.038, by + bh * (0.4 + f * 0.24) + bh * 0.14, dusk ? [30, 36, 58] : [70, 112, 152], 0.9);
  }
  // palmiers en silhouette (tronc + palmes)
  const palm = (pxx, s) => {
    const top = { x: pxx + s * 0.12, y: h * 0.8 - s };
    for (let t = 0; t <= 1; t += 0.05) {
      const x = pxx + (top.x - pxx) * t * t;
      const y = h * 0.8 - s * t;
      cv.ellipse(x, y, s * 0.018, s * 0.02, [10, 26, 18], 0.95);
    }
    for (let f = 0; f < 9; f++) {
      const ang = -Math.PI * 0.95 + (f / 8) * Math.PI * 1.1;
      for (let t = 0; t <= 1; t += 0.06) {
        const r = s * 0.3 * t;
        const x = top.x + Math.cos(ang + t * 0.5) * r;
        const y = top.y + Math.sin(ang + t * 0.35) * r * 0.6 - r * 0.3 * (1 - t);
        cv.ellipse(x, y, s * 0.012, s * 0.012, [10, 26, 18], 0.9);
      }
    }
  };
  palm(w * 0.86, h * 0.5); palm(w * 0.94, h * 0.42); palm(w * 0.08, h * 0.4);
  // pots de plantes devant
  for (let i = 0; i < 5; i++) {
    const pxp = w * (0.3 + rng() * 0.44), pyp = h * 0.83;
    cv.ellipse(pxp, pyp, w * 0.012, h * 0.018, [40, 84, 46], 0.9);
    cv.rect(pxp - w * 0.006, pyp, pxp + w * 0.006, pyp + h * 0.02, [90, 62, 40], 1);
  }
  cv.noise(rng, 7);
  cv.vignette(dusk ? 0.5 : 0.28);
  return cv.px;
}

function hall(w, h, seed, warm = 1) {
  const rng = mulberry32(seed);
  const cv = canvas(w, h);
  cv.gradY([[0, [8, 7, 5]], [0.5, [22, 17, 10]], [1, [10, 8, 6]]]);
  cv.glow(w * 0.5, h * 0.3, w * 0.42, GOLD_L, 0.5 * warm, 2.4);
  // poutres de lumière
  for (let i = 0; i < 5; i++) {
    const cx = w * (0.3 + i * 0.1) + (rng() - 0.5) * w * 0.05;
    cv.beam(cx, w * 0.02, w * (0.12 + rng() * 0.08), h * 0.05, h * 0.62, GOLD_P, 0.12 + rng() * 0.08);
  }
  cv.glow(w * 0.5, h * 0.6, w * 0.26, GOLD, 0.7, 2);
  // scène / estrade
  cv.rect(w * 0.18, h * 0.6, w * 0.82, h * 0.68, [36, 28, 16], 1);
  cv.rect(w * 0.18, h * 0.6, w * 0.82, h * 0.615, [150, 116, 50], 0.8);
  // pupitre + silhouettes sur scène
  cv.rect(w * 0.485, h * 0.5, w * 0.515, h * 0.6, [16, 12, 8], 1);
  for (let i = 0; i < 4; i++) {
    const sx = w * (0.36 + i * 0.09);
    cv.ellipse(sx, h * 0.52, w * 0.012, h * 0.02, [12, 9, 6], 1);
    cv.rect(sx - w * 0.011, h * 0.54, sx + w * 0.011, h * 0.6, [12, 9, 6], 1);
  }
  // foule en silhouettes
  for (let x = 0; x < w; x += 6) {
    const bh = h * (0.7 + Math.sin(x * 0.03 + seed) * 0.03 + rng() * 0.05);
    cv.rect(x, bh, x + 6, h, [8, 6, 4], 1);
    cv.ellipse(x + 3, bh - h * 0.02, 5, 6, [8, 6, 4], 1);
  }
  // bras levés
  for (let i = 0; i < 8; i++) {
    const ax = rng() * w, ay = h * (0.72 + rng() * 0.1);
    cv.rect(ax, ay - h * 0.05, ax + 3, ay, [8, 6, 4], 1);
  }
  // poussières d'or
  for (let i = 0; i < 60; i++) dot(cv, rng() * w, h * (0.1 + rng() * 0.55), 1 + rng() * 2.4, GOLD_P, 0.25 + rng() * 0.5);
  cv.noise(rng, 6);
  cv.vignette(0.5);
  return cv.px;
}

function bokehHall(w, h, seed) {
  const rng = mulberry32(seed);
  const cv = canvas(w, h);
  cv.gradY([[0, [10, 8, 6]], [0.55, [26, 20, 10]], [1, [12, 9, 6]]]);
  cv.glow(w * 0.5, h * 0.42, w * 0.5, GOLD, 0.55, 2.6);
  cv.rect(0, h * 0.68, w, h, [8, 6, 4], 1);
  cv.rect(w * 0.1, h * 0.62, w * 0.9, h * 0.68, [30, 24, 12], 1); // rangées de sièges
  for (let r = 0; r < 3; r++) cv.rect(w * 0.1, h * (0.63 + r * 0.02), w * 0.9, h * (0.635 + r * 0.02), [46, 36, 16], 0.7);
  for (let i = 0; i < 46; i++) { // bokeh doré
    const r = w * (0.008 + rng() * 0.035);
    const c = rng() < 0.6 ? GOLD_L : rng() < 0.5 ? GOLD_P : GOLD;
    cv.ellipse(rng() * w, h * (0.05 + rng() * 0.6), r, r, c, 0.08 + rng() * 0.3);
    cv.ellipse(rng() * w, h * (0.05 + rng() * 0.6), r * 0.4, r * 0.4, [255, 240, 200], 0.15);
  }
  for (let i = 0; i < 10; i++) { // guirlande de points
    dot(cv, w * (0.15 + i * 0.075), h * 0.16 + Math.sin(i) * h * 0.02, 3, GOLD_P, 0.9);
  }
  cv.noise(rng, 6);
  cv.vignette(0.5);
  return cv.px;
}

/* ───────── Génération ───────── */
const jobs = [
  // Scène principale de l'accueil
  ["stage-campus.png", 1600, 640, (w, h) => campus(w, h, 11)],
  ["stage-worship.png", 1600, 640, (w, h) => hall(w, h, 23)],
  ["stage-events.png", 1600, 640, (w, h) => bokehHall(w, h, 31)],
  // Cartes d'accès rapide
  ["card-photos.png", 880, 400, (w, h) => campus(w, h, 5)],
  ["card-video.png", 880, 400, (w, h) => hall(w, h, 7)],
  ["card-events.png", 880, 400, (w, h) => bokehHall(w, h, 9)],
  // Album « campus »
  ["photos/campus-1.png", 1200, 900, (w, h) => campus(w, h, 41)],
  ["photos/campus-2.png", 1200, 800, (w, h) => campus(w, h, 42)],
  ["photos/campus-3.png", 1200, 1000, (w, h) => campus(w, h, 43, 1)],
  ["photos/campus-4.png", 1200, 800, (w, h) => campus(w, h, 44)],
  // Album « cultes »
  ["photos/culte-1.png", 1200, 800, (w, h) => hall(w, h, 51)],
  ["photos/culte-2.png", 1200, 1000, (w, h) => hall(w, h, 52)],
  ["photos/culte-3.png", 1200, 800, (w, h) => hall(w, h, 53)],
  ["photos/culte-4.png", 1200, 900, (w, h) => hall(w, h, 54)],
  // Album « événements »
  ["photos/event-1.png", 1200, 800, (w, h) => bokehHall(w, h, 61)],
  ["photos/event-2.png", 1200, 900, (w, h) => bokehHall(w, h, 62)],
  ["photos/event-3.png", 1200, 800, (w, h) => bokehHall(w, h, 63)],
  ["photos/event-4.png", 1200, 1000, (w, h) => campus(w, h, 64, 1)],
  // Affiches vidéo
  ["videos/culte.png", 1280, 720, (w, h) => hall(w, h, 71)],
  ["videos/enseignement.png", 1280, 720, (w, h) => hall(w, h, 72, 0.7)],
  ["videos/temoignage.png", 1280, 720, (w, h) => bokehHall(w, h, 73)],
  ["videos/ceremonie.png", 1280, 720, (w, h) => bokehHall(w, h, 74)],
  // Couvertures d'événements
  ["events/conference.png", 1200, 630, (w, h) => hall(w, h, 81)],
  ["events/graduation.png", 1200, 630, (w, h) => bokehHall(w, h, 82)],
  ["events/seminaire.png", 1200, 630, (w, h) => campus(w, h, 83)],
  ["events/culte.png", 1200, 630, (w, h) => hall(w, h, 84)],
  ["events/retraite.png", 1200, 630, (w, h) => campus(w, h, 85, 1)],
  ["events/concert.png", 1200, 630, (w, h) => bokehHall(w, h, 86)],
];

fs.mkdirSync(OUT, { recursive: true });
for (const dir of ["photos", "videos", "events"]) fs.mkdirSync(path.join(OUT, dir), { recursive: true });
for (const [name, w, h, paint] of jobs) {
  writePng(path.join(OUT, name), w, h, paint(w, h));
  console.log("✓", name, `${w}x${h}`);
}
console.log(`${jobs.length} visuels « Exemple » générés dans public/media/`);
