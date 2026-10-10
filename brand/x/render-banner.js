const { chromium } = require('playwright');
(async () => {
  const out = process.argv[2];
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1500, height: 500 }, deviceScaleFactor: 2 });
  await p.goto('http://localhost:3123/', { waitUntil: 'networkidle', timeout: 120000 });
  await p.addStyleTag({ content: `
    header, nav, [data-nextjs-toast], nextjs-portal { display:none !important }
    .planche { inset:0 !important; border-radius:0 !important; box-shadow:none !important }
    #top h1 { font-size:72px !important; max-width:none !important }
    #top h1 + p { display:none !important }
    #top h1 ~ div, #top .scroll-cue-dot { display:none !important }
    #top [class*="bottom-5"] { display:none !important }
  `});
  await p.evaluate(() => {
    const box = document.querySelector('#top h1').parentElement;
    box.style.left = '5%'; box.style.top = '40%'; box.style.maxWidth = '620px';
  });
  await p.waitForTimeout(2500);
  await p.screenshot({ path: out });
  await b.close();
})();
