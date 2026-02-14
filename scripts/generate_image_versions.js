// Script per ridimensionare immagini di pianeti e stelle
// Usa la libreria 'sharp'. Esegui: npm install sharp

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const baseDirs = [
  path.join(__dirname, '../frontend/public/images/planets'),
  path.join(__dirname, '../frontend/public/images/stars')
];

const sizes = [
  { name: 'thumbs', width: 64, height: 64 },
  { name: 'medium', width: 128, height: 128 }
];

baseDirs.forEach((dir) => {
  fs.readdirSync(dir).forEach((file) => {
    if (!file.endsWith('.png')) return;
    sizes.forEach((size) => {
      const outDir = path.join(dir, size.name);
      if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
      const inputPath = path.join(dir, file);
      const outputPath = path.join(outDir, file);
      sharp(inputPath)
        .resize(size.width, size.height, { fit: 'contain', background: { r:0, g:0, b:0, alpha:0 } })
        .toFile(outputPath)
        .then(() => console.log(`Creato ${outputPath}`))
        .catch((err) => console.error(`Errore su ${file}:`, err));
    });
  });
});
