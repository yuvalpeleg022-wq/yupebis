// Renders a carousel's slides to PNG with Playwright.
//   node render.js 01   -> carousel-01/slide-XX.png (1080x1350), carousel-preview.png,
//                          exports/carousel-01/slide-XX@2x.png (2160x2700), exports/carousel-01.zip
const { chromium } = require("playwright");
const { execFileSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const ID = (process.argv[2] || "01").padStart(2, "0");
const ROOT = __dirname;
const TPL = "file://" + path.join(ROOT, "templates", "carousel.html");
const OUT = path.join(ROOT, `carousel-${ID}`);
const EXP = path.join(ROOT, "exports", `carousel-${ID}`);
const pad = (n) => String(n).padStart(2, "0");

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(EXP, { recursive: true });
  const browser = await chromium.launch();
  let total = 0;

  for (const scale of [1, 2]) {
    const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: scale });
    for (let i = 1; total === 0 || i <= total; i++) {
      await page.goto(`${TPL}?carousel=${ID}&slide=${i}`);
      await page.waitForFunction(() => document.body.dataset.ready === "1");
      if (!total) total = await page.evaluate(() => window.SLIDES.length);
      await page.evaluate(() => document.fonts.ready);
      // Force-load the Hebrew faces, then verify they resolve (guards against fallback fonts)
      const fonts = await page.evaluate(async () => ({
        heebo: (await document.fonts.load('400 40px "Heebo"', "א")).length > 0 && document.fonts.check('400 40px "Heebo"', "א"),
        frank: (await document.fonts.load('500 120px "Frank Ruhl Libre"', "א")).length > 0 && document.fonts.check('500 120px "Frank Ruhl Libre"', "א"),
      }));
      if (!fonts.heebo || !fonts.frank) throw new Error(`Hebrew fonts not loaded on slide ${i}: ${JSON.stringify(fonts)}`);
      // QA: report any slide-level text that overflows the 1080px canvas
      const overflow = await page.evaluate(() => [...document.querySelectorAll(".content *, .topbar *, .footer *")]
        .filter((e) => { const r = e.getBoundingClientRect(); return r.width && (r.left < 0 || r.right > 1080 || r.bottom > 1350); })
        .map((e) => e.className || e.tagName));
      if (overflow.length) console.warn(`  ! slide ${i} overflow:`, overflow.slice(0, 5));
      const file = scale === 1 ? path.join(OUT, `slide-${pad(i)}.png`) : path.join(EXP, `slide-${pad(i)}@2x.png`);
      await page.screenshot({ path: file, clip: { x: 0, y: 0, width: 1080, height: 1350 } });
      console.log("✓", path.relative(ROOT, file));
    }
    await page.close();
  }

  // Preview strip: slides laid out right-to-left (reading order of a Hebrew carousel)
  const imgs = Array.from({ length: total }, (_, i) =>
    "data:image/png;base64," + fs.readFileSync(path.join(OUT, `slide-${pad(i + 1)}.png`)).toString("base64"));
  const W = 432, H = 540, GAP = 28, PAD = 60;
  const width = PAD * 2 + total * W + (total - 1) * GAP, height = PAD * 2 + H;
  const p = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2 });
  await p.setContent(`<html dir="rtl"><body style="margin:0;background:#141414;width:${width}px;height:${height}px;
    display:flex;gap:${GAP}px;padding:${PAD}px;box-sizing:border-box">
    ${imgs.map((src) => `<img src="${src}" style="width:${W}px;height:${H}px;border-radius:10px;box-shadow:0 20px 50px rgba(0,0,0,.6)">`).join("")}
    </body></html>`);
  await p.screenshot({ path: path.join(OUT, "carousel-preview.png") });
  console.log(`✓ carousel-${ID}/carousel-preview.png`);
  await browser.close();

  // ZIP archive of the Instagram-ready PNGs
  const zip = path.join(ROOT, "exports", `carousel-${ID}.zip`);
  fs.rmSync(zip, { force: true });
  execFileSync("zip", ["-qr", zip, `carousel-${ID}`], { cwd: ROOT });
  console.log(`✓ exports/carousel-${ID}.zip`);
})();
