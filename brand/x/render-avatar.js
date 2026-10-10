const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 400, height: 400 }, deviceScaleFactor: 2 });
  await p.goto('file://' + process.argv[2]); await p.screenshot({ path: process.argv[3] }); await b.close();
})();
