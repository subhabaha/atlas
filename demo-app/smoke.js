const { chromium } = require('playwright-core');
const path = require('path');
const EXE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

(async () => {
  const files = process.argv.slice(2);
  if (!files.length) { console.error('usage: node smoke.js <html...>'); process.exit(2); }
  const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
  let fail = 0;
  for (const f of files) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errors = [];
    page.on('console', m => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });
    page.on('pageerror', e => errors.push('pageerror: ' + e.message));
    const url = 'file://' + path.resolve(f);
    await page.goto(url, { waitUntil: 'networkidle' }).catch(e => errors.push('goto: ' + e.message));
    await page.waitForTimeout(700);
    const svgCount = await page.$$eval('svg', els => els.length).catch(() => 0);
    const bodyLen = await page.evaluate(() => document.body.innerText.length).catch(() => 0);
    const shot = f.replace(/\//g, '__').replace(/\.html$/, '') + '.png';
    await page.screenshot({ path: '/tmp/shots/' + shot, fullPage: false }).catch(() => {});
    const status = errors.length ? 'FAIL' : 'ok';
    if (errors.length) fail++;
    console.log(`[${status}] ${f}  svg=${svgCount} textLen=${bodyLen}`);
    errors.slice(0, 6).forEach(e => console.log('    ' + e));
    await page.close();
  }
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
