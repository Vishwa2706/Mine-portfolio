const { chromium } = require("playwright-core");
const path = require("node:path");

const edgePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH || "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const baseUrl = "http://localhost:3000";
const viewports = [
  { name: "mobile", width: 375, height: 900 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "laptop", width: 1024, height: 900 },
  { name: "desktop", width: 1440, height: 1000 }
];

(async () => {
  const browser = await chromium.launch({ executablePath: edgePath, headless: true });
  const failures = [];

  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    const consoleErrors = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => consoleErrors.push(error.message));
    await page.goto(baseUrl, { waitUntil: "networkidle" });
    await page.waitForTimeout(900);

    const dimensions = await page.evaluate(() => ({
      innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body.scrollWidth
    }));
    if (dimensions.scrollWidth > dimensions.innerWidth || dimensions.bodyWidth > dimensions.innerWidth) {
      failures.push(`${viewport.name}: horizontal overflow ${JSON.stringify(dimensions)}`);
    }
    if (consoleErrors.length) failures.push(`${viewport.name}: console errors: ${consoleErrors.join(" | ")}`);

    const brokenImages = await page.locator("img").evaluateAll((images) => images.filter((image) => !image.complete || image.naturalWidth === 0).map((image) => image.src));
    if (brokenImages.length) failures.push(`${viewport.name}: broken images: ${brokenImages.join(", ")}`);

    await page.screenshot({ path: path.join(__dirname, `../visual-${viewport.width}.png`), fullPage: true });
    await context.close();
  }

  const context = await browser.newContext({ viewport: { width: 1024, height: 900 } });
  const page = await context.newPage();
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.locator(".js-contact-form button").click();
  if (!await page.locator("#name-error").textContent()) failures.push("Form: inline validation did not appear");

  await page.route("**/api/contact", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 250));
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
  });
  await page.locator("#name").fill("Vishwa Test");
  await page.locator("#email").fill("test@example.com");
  await page.locator("#subject").fill("Project enquiry");
  await page.locator("#message").fill("This is a valid test message.");
  await page.locator(".js-contact-form button").click();
  if (!await page.locator(".js-contact-form button").isDisabled()) failures.push("Form: submit button was not disabled while sending");
  await page.waitForSelector(".form-status.is-success");

  await page.unroute("**/api/contact");
  await page.route("**/api/contact", (route) => route.fulfill({ status: 502, contentType: "application/json", body: JSON.stringify({ error: "Test failure" }) }));
  await page.locator("#name").fill("Vishwa Test");
  await page.locator("#email").fill("test@example.com");
  await page.locator("#subject").fill("Project enquiry");
  await page.locator("#message").fill("This is another valid test message.");
  await page.locator(".js-contact-form button").click();
  await page.waitForSelector(".form-status.is-error");
  await page.keyboard.press("Home");
  await page.keyboard.press("Tab");
  if (!await page.locator(".skip-link").evaluate((element) => element === document.activeElement)) failures.push("Keyboard: skip link is not the first focus target");
  await context.close();

  const reducedContext = await browser.newContext({ viewport: { width: 1024, height: 900 }, reducedMotion: "reduce" });
  const reducedPage = await reducedContext.newPage();
  await reducedPage.goto(baseUrl, { waitUntil: "networkidle" });
  const cursorDisplay = await reducedPage.locator(".cursor").evaluate((element) => getComputedStyle(element).display);
  if (cursorDisplay !== "none") failures.push("Reduced motion: custom cursor remains visible");
  await reducedContext.close();
  await browser.close();

  if (failures.length) {
    console.error(failures.join("\n"));
    process.exitCode = 1;
  } else {
    console.log("Responsive, console, image, form, keyboard, and reduced-motion checks passed at 375, 768, 1024, and 1440px.");
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
