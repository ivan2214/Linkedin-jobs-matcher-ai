import puppeteer from "puppeteer";
import fs from "fs/promises";
import path from "path";

export async function initializeBrowser() {
  return await puppeteer.launch({
    headless: false,
    args: [
      "--disable-blink-features=AutomationControlled",
      "--start-maximized",
      "--window-position=0,0",
    ],
    defaultViewport: null,
  });
}

export async function setupPage(page) {
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
  });
}

export async function loginToLinkedIn(page, email, password) {
  const cookiesPath = path.join(process.cwd(), "cookies.json");

  try {
    const cookiesString = await fs.readFile(cookiesPath, "utf-8");
    const cookies = JSON.parse(cookiesString);
    await page.setCookie(...cookies);
    console.log("Cookies cargadas exitosamente.");
    await page.goto("https://www.linkedin.com/jobs/");
  } catch {
    console.log("No se encontraron cookies, iniciando sesión.");
    await page.goto("https://www.linkedin.com/");
  }

  try {
    await page.waitForSelector("img.global-nav__me-photo", { timeout: 5000 });
    console.log("Sesión iniciada con cookies.");
  } catch (error) {
    console.log("Iniciando sesión...");
    await page.goto("https://www.linkedin.com/login");
    await page.type("#username", email, { delay: 100 });
    await page.type("#password", password, { delay: 100 });
    await page.click('button[type="submit"]');

    const cookies = await page.cookies();
    await fs.writeFile(cookiesPath, JSON.stringify(cookies, null, 2));
    console.log("Cookies guardadas correctamente.");
  }
}
