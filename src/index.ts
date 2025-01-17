import dotenv from "dotenv";
import { createOpenAICompatible, OpenAICompatibleProvider } from "@ai-sdk/openai-compatible";

import { Browser, Page } from "puppeteer";

import { generateSearchQueriesJobsSearched } from "./utils/searchQueries.js";
import {
  extractJobDetails,
  initializeBrowser,
  JobBrowser,
  loginToLinkedIn,
  setupPage,
} from "./services/browserService.js";
import { analyzeJobCompatibility, JobResponseAI } from "./services/aiService.js";
import { generateJobReport} from "./services/reportService.js";

// Cargar variables de entorno
dotenv.config();



class JobScraper {
  private lmstudio:OpenAICompatibleProvider<string, string, string> ;

  constructor() {
    this.lmstudio = createOpenAICompatible({
      name: "lmstudio",
      baseURL: "http://localhost:1234/v1",
      
    });
  }

  async scrapeLinkedIn(): Promise<JobBrowser[]> {
    const browser: Browser = await initializeBrowser();
    const page: Page = await browser.newPage();

    await setupPage(page);
    await loginToLinkedIn(
      page,
      process.env.LINKEDIN_EMAIL || '',
      process.env.LINKEDIN_PASSWORD || ''
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
        "li[data-occludable-job-id]:not(.jobs-search-results__job-card--is-collapsed)"
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


  async run(): Promise<void> {
    try {
      const linkedInJobs = await this.scrapeLinkedIn();
      const jobAnalyses: JobResponseAI[]=[]

      
      for (const job of linkedInJobs) {
        const analysis = await analyzeJobCompatibility(
          this.lmstudio("llama-3.2-1b"),
          job,
        );
        jobAnalyses.push(analysis);
      }
  
      console.log(`Total de ofertas encontradas: ${linkedInJobs.length}`);
      await generateJobReport(jobAnalyses);
      
    } catch (error) {
      console.error("Error in job scraping process:", error);
    }
  }
}

// Ejecutar scraper
const scraper = new JobScraper();
scraper.run().catch(console.error);
