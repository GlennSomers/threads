// Usage: node screenshot.js <url> <out.png>
// Takes a real screenshot of a web page (1200x1500 viewport, top of the page).
let chromium;
try { ({ chromium } = require('playwright')); } catch { console.error('Playwright is not installed (npm i -g playwright && npx playwright install chromium)'); process.exit(2); }
(async () => {
  const [url, out] = process.argv.slice(2);
  const b = await chromium.launch({ args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 1200, height: 1500 } });
  await p.goto(url, { waitUntil: 'load', timeout: 45000 });
  await p.waitForTimeout(1500);
  await p.screenshot({ path: out });
  await b.close();
})().catch(e => { console.error(e.message.split('\n')[0]); process.exit(1); });
