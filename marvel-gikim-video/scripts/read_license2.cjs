const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ proxy: { server: process.env.HTTPS_PROXY } });
  const p = await b.newPage();
  await p.goto('https://mixkit.co/license/#videoFree', { waitUntil: 'networkidle', timeout: 60000 });
  await p.waitForTimeout(2500);
  const txt = await p.evaluate(() => { const els = [...document.querySelectorAll('[data-test-id^="license-modal"]')]; return document.body.innerText; });
  console.log(txt); await b.close();
})().catch(e => { console.error(e.message); process.exit(1); });
