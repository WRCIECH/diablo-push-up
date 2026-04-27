// One-time script: converts SVG icons to PNG for PWA / iOS home screen.
// Run once locally: node scripts/generate-icons.mjs
// Then commit the generated PNGs — they don't need to be regenerated on every build.

import sharp from 'sharp';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const root     = dirname(dirname(fileURLToPath(import.meta.url)));
const iconsDir = join(root, 'client', 'public', 'icons');

const sizes = [
  { src: 'icon-192.svg', out: 'icon-192.png', size: 192 },
  { src: 'icon-512.svg', out: 'icon-512.png', size: 512 },
  { src: 'icon-192.svg', out: 'apple-touch-icon.png', size: 180 },
];

for (const { src, out, size } of sizes) {
  const srcPath = join(iconsDir, src);
  const outPath = join(iconsDir, out);
  if (!existsSync(srcPath)) { console.error(`Missing: ${srcPath}`); process.exit(1); }
  await sharp(readFileSync(srcPath)).resize(size, size).png().toFile(outPath);
  console.log(`✓  ${out}  (${size}×${size})`);
}
console.log('Done — commit the generated PNGs.');
