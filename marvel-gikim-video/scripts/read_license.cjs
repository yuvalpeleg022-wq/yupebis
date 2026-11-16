const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ proxy: { server: process.env.HTTPS_PROXY } });
  const p = await b.newPage({ ignoreHTTPSErrors: false });
  await p.goto('https://mixkit.co/license/#videoFree', { waitUntil: 'networkidle', timeout: 60000 });
  await p.waitForTimeout(2500);
  const btn = p.locator('[data-license="musicFree"]').first();
  
  const txt = await p.evaluate(() => { const m = document.querySelector('[data-test-id=license-modal-video-free]'); return (m ? m.innerText : document.body.innerText); });
  const i = txt.indexOf('Music'); console.log(txt.slice(0, 3500));
  await b.close();
})().catch(e => { console.error(e.message); process.exit(1); });
