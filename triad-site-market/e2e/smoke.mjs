// End-to-end smoke test: run with backend on :8000 and frontend on :3000.
// node e2e/smoke.mjs
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");

const BASE = process.env.BASE_URL || "http://localhost:3000";
const OUT = process.env.SHOTS || ".";
const email = `buyer${Date.now()}@example.com`;
const b = await chromium.launch();
process.on("unhandledRejection", async (e) => { console.error(e); try { await p.screenshot({ path: `${OUT}/failure.png` }); } catch {} process.exit(1); });
const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
const step = (s) => console.log("✓", s);

await p.goto(BASE);
await p.waitForSelector("a[href^='/sites/']");
await p.waitForTimeout(1500);
await p.screenshot({ path: `${OUT}/01-marketplace.png` });
const before = Number((await p.textContent("text=/\\d+ available/")).split(" ")[0]);
step(`marketplace shows ${before} sites`);

await p.goto(`${BASE}/register?next=/`);
await p.fill("#email", email);
await p.fill("#password", "password123");
await p.click("button:has-text('Create account')");
await p.waitForSelector("text=My sites");
step("registered");

await p.click("a[href^='/sites/']");
await p.waitForSelector("text=Buy this website");
await p.waitForTimeout(1200);
await p.screenshot({ path: `${OUT}/02-site-detail.png` });
await p.click("button:has-text('Buy this website')");
await p.waitForURL(/checkout\/mock/).catch(async (e) => { await p.screenshot({ path: `${OUT}/failure.png` }); console.log(await p.textContent("aside")); throw e; });
await p.click("button:has-text('Pay (success)')");
await p.waitForSelector("text=Webhook result: paid");
step("paid via mock provider webhook");
await p.waitForURL(/dashboard/);
await p.waitForSelector("text=Open editor");
step("site appears in dashboard");

await p.goto(BASE);
await p.waitForSelector("a[href^='/sites/']");
const after = Number((await p.textContent("text=/\\d+ available/")).split(" ")[0]);
if (after !== before - 1) throw new Error(`expected ${before - 1} available, got ${after}`);
step("sold site removed from marketplace");

await p.goto(`${BASE}/dashboard`);
await p.click("text=Open editor");
await p.waitForSelector("text=Sections · drag to reorder");
await p.click("button:has-text('Theme')");
await p.fill("input >> nth=1", "Edited with the visual editor");
await p.click("button:has-text('Apply theme')");
await p.waitForSelector("text=/Saved · revision 2/");
step("visual edit saved");
await p.click("button:has-text('AI editor')");
await p.fill("input[aria-label=Instruction]", "rename to Nova");
await p.click("button:has-text('Send')");
await p.waitForSelector("text=/active AI Editor subscription is required/");
step("AI editor correctly gated behind subscription");
await p.waitForTimeout(1500);
await p.screenshot({ path: `${OUT}/03-editor.png` });

await p.click("button:has-text('Sign out')");
await p.goto(`${BASE}/login?next=/admin`);
await p.fill("#email", "admin@triad.local");
await p.fill("#password", "adminpass123");
await p.click("button:has-text('Sign in')");
await p.waitForSelector("text=Control center");
await p.click("button:has-text('Generate websites')");
await p.waitForSelector("text=/ready for review/", { timeout: 60000 });
await p.click("li button >> nth=0");
await p.waitForSelector("text=Approve & list");
await p.waitForTimeout(1500);
await p.screenshot({ path: `${OUT}/04-admin-review.png` });
await p.click("text=Approve & list");
step("admin generated and approved a site");

const m = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await m.goto(BASE);
await m.waitForTimeout(1500);
await m.screenshot({ path: `${OUT}/05-mobile.png` });
await b.close();
console.log("E2E OK");
