// Génère les assets de marque à partir de public/logo.jpeg (fond blanc) :
//   public/brand/logo-full.png  — logo complet, fond transparent
//   public/brand/emblem.png     — emblème (cercle + croix), fond transparent
//   src/app/icon.png, src/app/apple-icon.png, src/app/favicon.ico
// Usage : node scripts/brand-assets.mjs
import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";

const SRC = "public/logo.jpeg";
const BG = { r: 10, g: 10, b: 10, alpha: 1 };

// Seuils calibrés sur le logo : l'or le plus pâle de la croix a un canal min ≈ 154,
// le fond blanc (bruit JPEG compris) a un canal min ≥ 245.
const OPAQUE_BELOW = 165;
const TRANSPARENT_ABOVE = 245;

/** Retire le fond blanc : or plein conservé tel quel, bords anticrénelés « démélangés » du blanc. */
async function whiteToAlpha(input) {
  const { data, info } = await sharp(input).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(info.width * info.height * 4);
  for (let i = 0, j = 0; i < data.length; i += 3, j += 4) {
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    const m = Math.min(r, g, b);
    const a = Math.min(1, Math.max(0, (TRANSPARENT_ABOVE - m) / (TRANSPARENT_ABOVE - OPAQUE_BELOW)));
    const un = (c) => (a === 0 ? 0 : Math.min(255, Math.max(0, Math.round((c - 255 * (1 - a)) / a))));
    out[j] = un(r);
    out[j + 1] = un(g);
    out[j + 2] = un(b);
    out[j + 3] = Math.round(a * 255);
  }
  return sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } }).png();
}

/** Boîte englobante des pixels opaques dans une zone. */
async function opaqueBounds(png, top, bottom) {
  const { data, info } = await png.clone().raw().toBuffer({ resolveWithObject: true });
  let [x0, y0, x1, y1] = [info.width, info.height, 0, 0];
  for (let y = top; y < bottom; y++)
    for (let x = 0; x < info.width; x++)
      if (data[(y * info.width + x) * 4 + 3] > 40) {
        x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
      }
  return { left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
}

const square = (img, size, pad, background = { r: 0, g: 0, b: 0, alpha: 0 }) =>
  img.clone().resize(size - pad * 2, size - pad * 2, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({ top: pad, bottom: pad, left: pad, right: pad, background })
    .png({ palette: true, compressionLevel: 9 });

/** ICO contenant des PNG (format accepté par tous les navigateurs modernes). */
function toIco(pngs) {
  const header = Buffer.alloc(6 + pngs.length * 16);
  header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(pngs.length, 4);
  let offset = header.length;
  pngs.forEach(({ size, buf }, i) => {
    const e = 6 + i * 16;
    header.writeUInt8(size >= 256 ? 0 : size, e); header.writeUInt8(size >= 256 ? 0 : size, e + 1);
    header.writeUInt16LE(1, e + 4); header.writeUInt16LE(32, e + 6);
    header.writeUInt32LE(buf.length, e + 8); header.writeUInt32LE(offset, e + 12);
    offset += buf.length;
  });
  return Buffer.concat([header, ...pngs.map((p) => p.buf)]);
}

const full = await whiteToAlpha(SRC);
const { height } = await sharp(SRC).metadata();
await mkdir("public/brand", { recursive: true });

const fullBox = await opaqueBounds(full, 0, height);
await full.clone().extract(fullBox).toFile("public/brand/logo-full.png");

// L'emblème est sous le texte : on cherche les pixels opaques dans la moitié basse.
const emblemBox = await opaqueBounds(full, Math.round(height * 0.37), height);
const emblem = sharp(await full.clone().extract(emblemBox).png().toBuffer());
await emblem.clone().resize(640, 640, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile("public/brand/emblem.png");

await (await square(emblem, 512, 24)).toFile("src/app/icon.png");
await (await square(emblem, 180, 18, BG)).toFile("src/app/apple-icon.png");

// Image Open Graph 1200×630 : logo complet centré sur le fond noir de la charte.
await full
  .clone()
  .extract(fullBox)
  .resize(1000, 480, { fit: "contain", background: BG })
  .extend({ top: 75, bottom: 75, left: 100, right: 100, background: BG })
  .png()
  .toFile("public/brand/og.png");
const icoSizes = [16, 32, 48];
const icoPngs = await Promise.all(icoSizes.map(async (size) => ({ size, buf: await square(emblem, size, 0).toBuffer() })));
await writeFile("src/app/favicon.ico", toIco(icoPngs));

console.log("Logo complet", fullBox, "· Emblème", emblemBox);
