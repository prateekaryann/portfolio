// Generate og-default.png from og-default.svg.
// Run: node scripts/generate-og.mjs
import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const svg = readFileSync(resolve(__dirname, '../public/og-default.svg'), 'utf-8');

const resvg = new Resvg(svg, {
  fitTo: { mode: 'width', value: 1200 },
  font: {
    loadSystemFonts: true,
    defaultFontFamily: 'Helvetica',
  },
});

const pngData = resvg.render();
const pngBuffer = pngData.asPng();

writeFileSync(resolve(__dirname, '../public/og-default.png'), pngBuffer);
console.log(`✓ wrote public/og-default.png (${pngBuffer.length} bytes, ${pngData.width}×${pngData.height})`);
