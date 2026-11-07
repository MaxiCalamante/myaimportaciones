import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const outputDir = resolve(process.cwd(), 'docs/redesign-screenshots-2026-11-07');
await mkdir(outputDir, { recursive: true });

const resolutions = [
  { name: 'desktop-grande-1920x1080', width: 1920, height: 1080 },
  { name: 'desktop-estandar-1440x900', width: 1440, height: 900 },
  { name: 'tablet-768x1024', width: 768, height: 1024 },
  { name: 'mobile-390x844', width: 390, height: 844 },
  { name: 'mobile-pequeno-360x800', width: 360, height: 800 },
];

const port = process.env.PORT || '3000';
const baseUrl = `http://localhost:${port}`;

console.log(`Starting capture against ${baseUrl}...`);

try {
  const browser = await chromium.launch({ headless: true });
  
  for (const res of resolutions) {
    console.log(`Capturing ${res.name} (${res.width}x${res.height})...`);
    const context = await browser.newContext({
      viewport: { width: res.width, height: res.height },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    
    // Visit home page
    await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.screenshot({
      path: resolve(outputDir, `${res.name}-home.png`),
      fullPage: false,
    });
    
    // Also capture full page scroll for mobile and desktop
    await page.screenshot({
      path: resolve(outputDir, `${res.name}-home-full.png`),
      fullPage: true,
    });

    console.log(`Saved screenshots for ${res.name}`);
    await context.close();
  }

  await browser.close();
  console.log(`All screenshots saved to ${outputDir}`);
} catch (err) {
  console.error('Screenshot capture error:', err.message);
  process.exit(1);
}
