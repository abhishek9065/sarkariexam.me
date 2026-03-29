import { chromium } from 'playwright';

const TARGET_URL = 'https://www.figma.com/make/JjTMXafrsEdJe1aUImgHqm/SarkariExam.me?t=MiVDt3IfdG9gOQUz-20&fullscreen=1&preview-route=%2Fadmin';
const CAPTURE_ID = '116f0883-227d-45eb-84a4-c54f147b7080';

async function captureForFigma() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Bypass CSP
  await page.route('**/*', async (route) => {
    try {
      const response = await route.fetch();
      const headers = { ...response.headers() };
      delete headers['content-security-policy'];
      delete headers['content-security-policy-report-only'];
      await route.fulfill({ response, headers });
    } catch {
      await route.continue();
    }
  });

  console.log('Navigating to Figma Make preview...');
  await page.goto(TARGET_URL, { waitUntil: 'networkidle', timeout: 60000 });
  
  console.log('Waiting for page to fully render...');
  await page.waitForTimeout(5000);

  // Inject the Figma capture script
  console.log('Injecting capture script...');
  const captureScript = await fetch('https://mcp.figma.com/mcp/html-to-design/capture.js').then(r => r.text());
  await page.evaluate((script) => {
    const el = document.createElement('script');
    el.textContent = script;
    document.head.appendChild(el);
  }, captureScript);

  await page.waitForTimeout(2000);

  // Trigger the capture
  console.log('Triggering capture...');
  try {
    const result = await page.evaluate((captureId) => {
      if (window.figma && window.figma.captureForDesign) {
        return window.figma.captureForDesign({
          captureId: captureId,
          endpoint: `https://mcp.figma.com/mcp/capture/${captureId}/submit`,
          selector: 'body'
        });
      }
      return { error: 'Figma capture not available' };
    }, CAPTURE_ID);
    console.log('Capture result:', result);
  } catch (err) {
    console.error('Capture error:', err.message);
  }

  // Take a screenshot as backup
  console.log('Taking screenshot...');
  await page.screenshot({ path: 'figma-admin-capture.png', fullPage: true });
  console.log('Screenshot saved to figma-admin-capture.png');

  await browser.close();
}

captureForFigma().catch(console.error);
