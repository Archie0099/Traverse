// Rasterize public/icon.svg into the PNG sizes the PWA manifest references.
// Run with: npm run gen:icons   (only needed when the icon changes)
import sharp from "sharp";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const svg = readFileSync(join(root, "public", "icon.svg"));

const targets = [
  { file: "pwa-192.png", size: 192 },
  { file: "pwa-512.png", size: 512 },
  { file: "maskable-512.png", size: 512 },
  { file: "apple-touch-icon.png", size: 180 },
];

for (const { file, size } of targets) {
  await sharp(svg).resize(size, size).png().toFile(join(root, "public", file));
  console.log("wrote public/" + file);
}

// Social card (1200×630) for Open Graph / Twitter previews.
const og = readFileSync(join(root, "public", "og-image.svg"));
await sharp(og).resize(1200, 630).png().toFile(join(root, "public", "og-image.png"));
console.log("wrote public/og-image.png");
