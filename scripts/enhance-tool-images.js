const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function enhanceAll() {
  const toolsDir = path.join(process.cwd(), 'public', 'products', 'tools');
  if (!fs.existsSync(toolsDir)) {
    console.error('Tools directory not found:', toolsDir);
    return;
  }

  const files = fs.readdirSync(toolsDir).filter((f) => f.endsWith('.jpg') || f.endsWith('.png'));
  console.log(`Starting image enhancement for ${files.length} tool images...`);

  let count = 0;
  let skipped = 0;
  const startTime = Date.now();

  // Process in batches of 25 concurrent sharp workers for speed and memory safety
  const BATCH_SIZE = 25;
  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    const batch = files.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(async (file) => {
        const filePath = path.join(toolsDir, file);
        try {
          const buffer = fs.readFileSync(filePath);
          
          // Get metadata
          const meta = await sharp(buffer).metadata();
          // If already 500 or larger and sharpened, skip
          if (meta.width >= 500 && meta.height >= 500) {
            skipped++;
            return;
          }

          // Enhance image with Lanczos3 upscale + unsharp mask sharpening + 92% mozjpeg
          const enhancedBuffer = await sharp(buffer)
            .resize(500, 500, {
              fit: 'contain',
              background: { r: 255, g: 255, b: 255, alpha: 1 },
              kernel: sharp.kernel.lanczos3,
            })
            .sharpen({ sigma: 1.2, m1: 1.5, m2: 0.5 })
            .jpeg({ quality: 92, mozjpeg: true })
            .toBuffer();

          fs.writeFileSync(filePath, enhancedBuffer);
          count++;
        } catch (err) {
          console.error(`Error processing ${file}:`, err.message);
        }
      })
    );

    if ((i + BATCH_SIZE) % 250 === 0 || i + BATCH_SIZE >= files.length) {
      const pct = Math.min(100, Math.round(((i + BATCH_SIZE) / files.length) * 100));
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      process.stdout.write(`\rProgress: ${pct}% (${count} enhanced, ${skipped} skipped) in ${elapsed}s...`);
    }
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n\n✅ ¡Mejora completada en ${totalTime}s!`);
  console.log(`Total mejoradas a 500x500 HD: ${count}`);
  console.log(`Ya en alta resolución: ${skipped}`);
}

enhanceAll().catch(console.error);
