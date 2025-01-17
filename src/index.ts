import {
	type OpenAICompatibleProvider,
	createOpenAICompatible,
} from "@ai-sdk/openai-compatible";
import dotenv from "dotenv";

/* import { createGoogleGenerativeAI, google, GoogleGenerativeAIProvider } from '@ai-sdk/google'; */

import type { Browser, Page } from "puppeteer";

import {
	type JobResponseAI,
	analyzeJobCompatibility,
} from "./services/aiService.js";
import {
	type JobBrowser,
	extractJobDetails,
	initializeBrowser,
	loginToLinkedIn,
	setupPage,
} from "./services/browserService.js";
import { generateJobReport } from "./services/reportService.js";
import { generateSearchQueriesJobsSearched } from "./utils/searchQueries.js";

// Cargar variables de entorno
dotenv.config();

class JobScraper {
	private lmstudio: OpenAICompatibleProvider<string, string, string>;
	/* private google: GoogleGenerativeAIProvider; */

	constructor() {
		this.lmstudio = createOpenAICompatible({
			name: "lmstudio",
			baseURL: "http://localhost:1234/v1",
		});
		/*  this.google = createGoogleGenerativeAI({
      apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || '',
      
    }); */
	}

	async scrapeLinkedIn(): Promise<JobBrowser[]> {
		const browser: Browser = await initializeBrowser();
		const page: Page = await browser.newPage();

		await setupPage(page);
		await loginToLinkedIn(
			page,
			process.env.LINKEDIN_EMAIL || "",
			process.env.LINKEDIN_PASSWORD || "",
		);

		const searchQueries: string[] = generateSearchQueriesJobsSearched();
		const shuflledQueries = searchQueries
			.sort(() => Math.random() - 0.5)
			.slice(0, 3);

		const allJobs: JobBrowser[] = [];
		let queryIndex = 0;

		for (const query of shuflledQueries) {
			queryIndex++;

			console.log(`${queryIndex} / ${shuflledQueries.length}`);
			console.log("----------------------------");
			console.log(`Buscando trabajos con query: ${query}`);
			try {
				await page.waitForSelector(".jobs-search-box__text-input");
				await page.type(".jobs-search-box__text-input", query, { delay: 100 });

				await page.keyboard.press("Enter");

				await page.waitForSelector(
					"li[data-occludable-job-id]:not(.jobs-search-results__job-card--is-collapsed)",
				);
				const jobs: JobBrowser[] = await extractJobDetails(page);
				allJobs.push(...jobs);
			} catch (error) {
				console.error(`Error searching for query ${query}:`, error);
			}
		}

		await browser.close();

		return this.removeDuplicateJobs(allJobs);
	}

	removeDuplicateJobs(jobs: JobBrowser[]): JobBrowser[] {
		const uniqueJobs: JobBrowser[] = [];
		const seenTitles = new Set<string>();

		for (const job of jobs) {
			if (!seenTitles.has(job.title)) {
				uniqueJobs.push(job);
				seenTitles.add(job.title);
			}
		}

		return uniqueJobs;
	}
	// Spinner para mostrar carga
	startLoadingSpinner(message: string): NodeJS.Timeout {
		const spinnerChars = ["|", "/", "-", "\\"];
		let index = 0;

		return setInterval(() => {
			process.stdout.write(`\r${message} ${spinnerChars[index++]}`);
			index %= spinnerChars.length;
		}, 100);
	}

	stopLoadingSpinner(spinner: NodeJS.Timeout, doneMessage: string) {
		clearInterval(spinner);
		process.stdout.write(`\r${doneMessage}\n`);
	}

	async run(): Promise<void> {
		try {
			const linkedInJobs = await this.scrapeLinkedIn();
			/* const model = google('gemini-1.5-pro-latest'); */
			const model = this.lmstudio("llama-3.2-1b");

			let jobAnalyses: JobResponseAI[] = [];

			try {
				// Iniciar spinner de carga
				const spinner = this.startLoadingSpinner(
					"🔍 Analizando compatibilidad de ofertas",
				);

				jobAnalyses = await analyzeJobCompatibility(model, linkedInJobs);

				// Detener spinner
				this.stopLoadingSpinner(spinner, "✅ Análisis completado.");
			} catch (error) {
				console.error("❌ Error en el análisis de compatibilidad:", error);
			}

			console.log(`📄 Total de ofertas encontradas: ${linkedInJobs.length}`);
			console.log("----------------------------");
			console.log(`📊 Total de ofertas compatibles: ${jobAnalyses.length}`);

			await generateJobReport(jobAnalyses);
		} catch (error) {
			console.error("❌ Error en el proceso de búsqueda de trabajos:", error);
		}
	}
}

// Ejecutar scraper
const scraper = new JobScraper();
scraper.run().catch(console.error);
