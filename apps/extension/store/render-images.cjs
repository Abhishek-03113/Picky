// Renders promo.html at the Chrome Web Store's promo sizes (small tile 440x280, marquee 1400x560).
const { chromium } = require("playwright");
const { join } = require("node:path");

const SIZES = [
  { file: "promo-small-440x280.png", width: 440, height: 280 },
  { file: "promo-marquee-1400x560.png", width: 1400, height: 560 },
];

(async () => {
  const browser = await chromium.launch();
  for (const { file, width, height } of SIZES) {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.goto(`file://${join(__dirname, "promo.html")}`, { waitUntil: "load" });
    await page.screenshot({ path: join(__dirname, file) });
    await page.close();
  }
  await browser.close();
})();
