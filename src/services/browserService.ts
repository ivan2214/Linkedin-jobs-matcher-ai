import fs from "node:fs/promises";
import path from "node:path";
import puppeteer, { type Browser, type Page } from "puppeteer";

export interface JobBrowser {
	title: string;
	company: string;
	location: string;
	description: string;
	url: string;
}

export async function initializeBrowser(): Promise<Browser> {
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

export async function setupPage(page: Page): Promise<void> {
	await page.evaluateOnNewDocument(() => {
		Object.defineProperty(navigator, "webdriver", { get: () => false });
	});
}

export async function loginToLinkedIn(
	page: Page,
	email: string,
	password: string,
): Promise<void> {
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

export async function extractJobDetails(page: Page): Promise<JobBrowser[]> {
	const jobs = await page.evaluate(() => {
		const jobCards = document.querySelectorAll(".job-card-container");
		const jobData: JobBrowser[] = [];

		for (const card of jobCards) {
			const title =
				card
					.querySelector(".job-card-container__link span strong")
					?.textContent?.trim() || "No disponible";

			const company =
				card
					.querySelector(".artdeco-entity-lockup__subtitle")
					?.textContent?.trim() || "No disponible";
			const location =
				card
					.querySelector(".job-card-container__metadata-wrapper li")
					?.textContent?.trim() || "No disponible";

			const description =
				card.querySelector(".jobs-description__content")?.textContent?.trim() ||
				"No disponible";

			const linkedinUrl = "https://www.linkedin.com";

			const link = card
				.querySelector(".job-card-container__link")
				?.getAttribute("href");

			jobData.push({
				title,
				company,
				location,
				description,
				url: `${linkedinUrl}${link}`,
			});
		}

		return jobData;
	});

	return jobs;
}
