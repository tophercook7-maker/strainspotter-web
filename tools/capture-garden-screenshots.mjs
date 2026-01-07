import fs from 'fs';
import { chromium } from 'playwright';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000/garden';
const OUTPUT_DIR = 'public/screenshots';

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900, file: 'garden-desktop-1440x900.png' },
  { name: 'mobile', width: 390, height: 844, file: 'garden-mobile-390x844.png' },
  { name: 'tablet', width: 834, height: 1112, file: 'garden-tablet-834x1112.png' },
];

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function capture() {
  ensureDir(OUTPUT_DIR);

  for (const vp of VIEWPORTS) {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      colorScheme: 'dark',
      deviceScaleFactor: 1,
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();

    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Disable animations/transitions for deterministic shots
    await page.addStyleTag({ content: '* { animation: none !important; transition: none !important; }' });

    // Ensure top of page
    await page.evaluate(() => window.scrollTo(0, 0));

    await page.screenshot({
      path: `${OUTPUT_DIR}/${vp.file}`,
      fullPage: true,
    });

    await browser.close();
  }
}

capture().catch((err) => {
  console.error('Screenshot capture failed:', err);
  process.exit(1);
});
