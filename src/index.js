import dotenv from "dotenv";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

import { generateSearchQueriesJobsSearched } from "./utils/searchQueries.js";
import {
  initializeBrowser,
  loginToLinkedIn,
  setupPage,
} from "./services/browserService.js";
import { analyzeJobCompatibility } from "./services/aiService.js";
import { generateJobReport } from "./services/reportService.js";

// Cargar variables de entorno
dotenv.config();

class JobScraper {
  constructor() {
    this.lmstudio = createOpenAICompatible({
      name: "lmstudio",
      baseURL: "http://localhost:1234/v1",
      maxRetries: 1,
    });
  }

  removeDuplicateJobs(jobs) {
    const uniqueJobs = [];
    const seenTitles = new Set();

    for (const job of jobs) {
      if (!seenTitles.has(job.title)) {
        uniqueJobs.push(job);
        seenTitles.add(job.title);
      }
    }

    return uniqueJobs;
  }

  async scrapeLinkedIn() {
    const browser = await initializeBrowser();
    const page = await browser.newPage();

    await setupPage(page);
    await loginToLinkedIn(
      page,
      process.env.LINKEDIN_EMAIL,
      process.env.LINKEDIN_PASSWORD
    );

    const searchQueries = generateSearchQueriesJobsSearched();
    const shuflledQueries = searchQueries
      .sort(() => Math.random() - 0.5)
      .slice(0, 1);

    const allJobs = [];
    let queryIndex = 0;
    for (const query of shuflledQueries) {
      queryIndex++;

      console.log(`${queryIndex} / ${shuflledQueries.length}`);
      console.log("----------------------------");
      console.log(`Buscando trabajos con query: ${query}`);

      await page.goto("https://www.linkedin.com/jobs/");
      await page.waitForSelector(".jobs-search-box__text-input");
      await page.type(".jobs-search-box__text-input", query, { delay: 100 });

      await page.keyboard.press("Enter");

      await page.waitForSelector(
        "li[data-occludable-job-id]:not(.jobs-search-results__job-card--is-collapsed)"
      );

      const jobs = await page.evaluate(() => {
        const jobCards = document.querySelectorAll(".job-card-container");
        const jobData = [];

        jobCards.forEach((card) => {
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
          const isView = card.querySelector(
            ".job-card-container__footer-job-state"?.textContent?.trim() ||
              false
          );

          const description =
            card
              .querySelector(".jobs-description__content")
              ?.textContent?.trim() || "No disponible";

          const linkedinUrl = "https://www.linkedin.com";

          const link = card
            .querySelector(".job-card-container__link")
            ?.getAttribute("href");

          jobData.push({
            title,
            company,
            location,
            isView,
            description,
            link: `${linkedinUrl}${link}`,
          });
        });

        return jobData;
      });

      // Imprimir los resultados
      console.log(jobs);

      allJobs.push(...jobs);
    }

    await browser.close();
    return this.removeDuplicateJobs(allJobs);
  }

  async run() {
    const linkedInJobs = await this.scrapeLinkedIn();

    const jobAnalyses = [];
    for (const job of linkedInJobs) {
      const analysis = await analyzeJobCompatibility(
        job,
        this.lmstudio("llama-3.2-1b")
      );
      jobAnalyses.push(analysis);
    }

    console.log(`Total de ofertas encontradas: ${linkedInJobs.length}`);
    await generateJobReport(jobAnalyses);
  }
}

// Ejecutar scraper
const scraper = new JobScraper();
scraper.run().catch(console.error);
