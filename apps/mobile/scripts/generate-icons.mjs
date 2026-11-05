import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const marks = fileURLToPath(new URL('../../../brand/marks/', import.meta.url));
const out = fileURLToPath(new URL('../assets/images/', import.meta.url));

await mkdir(out, { recursive: true });

const icon = await sharp(`${marks}/icon.svg`).resize(1024, 1024).png().toBuffer();
await sharp(icon).toFile(`${out}/icon.png`);
await sharp(icon).resize(48, 48).png().toFile(`${out}/favicon.png`);

const symbol = await sharp(`${marks}/symbol-light.svg`)
  .resize(620, 620, { fit: 'contain' })
  .png()
  .toBuffer();

const foreground = await sharp({
  create: { width: 1024, height: 1024, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
})
  .composite([{ input: symbol, gravity: 'center' }])
  .png()
  .toBuffer();
await sharp(foreground).toFile(`${out}/android-icon-foreground.png`);
await sharp(foreground).toFile(`${out}/android-icon-monochrome.png`);

await sharp({
  create: { width: 1024, height: 1024, channels: 4, background: '#0a0a0a' },
})
  .png()
  .toFile(`${out}/android-icon-background.png`);

const splash = await sharp(`${marks}/symbol-light.svg`)
  .resize(360, 360, { fit: 'contain' })
  .png()
  .toBuffer();
await sharp({
  create: { width: 512, height: 512, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
})
  .composite([{ input: splash, gravity: 'center' }])
  .png()
  .toFile(`${out}/splash-icon.png`);

console.log('icons generated');
