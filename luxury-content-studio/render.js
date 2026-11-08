// Renders every slide to PNG with Playwright.
//   node render.js            -> carousel-01/*.png (1080x1350) + exports/*@2x.png (2160x2700) + preview
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const ROOT = __dirname;
const TPL = "file://" + path.join(ROOT, "templates", "carousel.html");
const OUT = path.join(ROOT, "carousel-01");
const EXP = path.join(ROOT, "exports");
const TOTAL = 5;

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(EXP, { recursive: true });
  const browser = await chromium.launch();

  for (const scale of [1, 2]) {
    const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: scale });
    for (let i = 1; i <= TOTAL; i++) {
      await page.goto(`${TPL}?slide=${i}`);
      await page.evaluate(() => document.fonts.ready);
      // Force-load the Hebrew faces, then verify they resolve (guards against fallback fonts)
      const fonts = await page.evaluate(async () => ({
        heebo: (await document.fonts.load('400 40px "Heebo"', "א")).length > 0 && document.fonts.check('400 40px "Heebo"', "א"),
        frank: (await document.fonts.load('500 120px "Frank Ruhl Libre"', "א")).length > 0 && document.fonts.check('500 120px "Frank Ruhl Libre"', "א"),
      }));
      if (!fonts.heebo || !fonts.frank) throw new Error(`Hebrew fonts not loaded on slide ${i}: ${JSON.stringify(fonts)}`);
      const n = String(i).padStart(2, "0");
      const file = scale === 1 ? path.join(OUT, `slide-${n}.png`) : path.join(EXP, `slide-${n}@2x.png`);
      await page.screenshot({ path: file, clip: { x: 0, y: 0, width: 1080, height: 1350 } });
      console.log("✓", path.relative(ROOT, file));
    }
    await page.close();
  }

  // Preview strip: slides laid out right-to-left (reading order of a Hebrew carousel)
  const imgs = Array.from({ length: TOTAL }, (_, i) =>
    "data:image/png;base64," + fs.readFileSync(path.join(OUT, `slide-${String(i + 1).padStart(2, "0")}.png`)).toString("base64"));
  const W = 432, H = 540, GAP = 28, PAD = 60;
  const width = PAD * 2 + TOTAL * W + (TOTAL - 1) * GAP, height = PAD * 2 + H;
  const p = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2 });
  await p.setContent(`<html dir="rtl"><body style="margin:0;background:#141414;width:${width}px;height:${height}px;
    display:flex;gap:${GAP}px;padding:${PAD}px;box-sizing:border-box">
    ${imgs.map((src) => `<img src="${src}" style="width:${W}px;height:${H}px;border-radius:10px;box-shadow:0 20px 50px rgba(0,0,0,.6)">`).join("")}
    </body></html>`);
  await p.screenshot({ path: path.join(OUT, "carousel-preview.png") });
  console.log("✓ carousel-01/carousel-preview.png");
  await browser.close();
})();
