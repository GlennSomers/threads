// Usage: node render.js <style.json> <words.json> <framesIn dir> <framesOut dir> <shotsDir> <fps>
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
(async () => {
  const [stylePath, wordsPath, inDir, outDir, shotsDir, fpsArg] = process.argv.slice(2);
  const fps = +fpsArg || 30;
  const style = JSON.parse(fs.readFileSync(stylePath)), words = JSON.parse(fs.readFileSync(wordsPath));
  const b = await chromium.launch({ args: ['--no-sandbox', '--allow-file-access-from-files'] });
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on('pageerror', e => console.error('page error:', e.message));
  await p.goto('file://' + path.join(__dirname, 'render.html'));
  await p.evaluate(([s, w, sb]) => setup(s, w, sb), [style, words, 'file://' + shotsDir + '/']);
  fs.writeFileSync(path.join(outDir, 'events.json'), JSON.stringify(await p.evaluate(() => events())));
  const files = fs.readdirSync(inDir).filter(f => f.endsWith('.jpg')).sort();
  const n = Math.min(files.length, Math.ceil(style.dur * fps));
  for (let i = 0; i < n; i++) {
    await p.evaluate(([t, src]) => draw(t, src), [i / fps, 'file://' + path.join(inDir, files[i])]);
    await p.screenshot({ path: path.join(outDir, String(i + 1).padStart(5, '0') + '.jpg'), type: 'jpeg', quality: 92 });
    if (i % 60 === 0) console.log(`frame ${i}/${n}`);
  }
  await b.close();
})().catch(e => { console.error(e.message.split('\n')[0]); process.exit(1); });
