import puppeteer from "puppeteer";

import { generateText } from "ai";
import dotenv from "dotenv";
import fs from "fs/promises";
import path from "path";
import { userProfile } from "./profile.js";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

// Cargar variables de entorno
dotenv.config();

class JobScraper {
  constructor() {
    this.lmstudio = createOpenAICompatible({
      name: "lmstudio",
      baseURL: "http://localhost:1234/v1",
      maxRetries: 1, // immediately error if the server is not running
    });
  }

  generateSearchQueries() {
    return [
      // Búsquedas originales con booleanos

      // Búsquedas específicas con experiencia
      '(Frontend OR "Front End") AND (Developer OR Engineer) AND ("1-2 years" OR "hasta 2 años")',
      'Developer AND (Frontend OR "Front End") AND ("1 year" OR "2 years") AND (Remote OR Argentina)',
      '(React OR JavaScript) AND Developer AND ("1-2 years" OR "2 years experience")',

      // Búsquedas en español con experiencia
      'desarrollador AND frontend AND ("1-2 años" OR "hasta 2 años") AND (remoto OR argentina)',
      'frontend AND (desarrollador OR programador) AND "1-2 años" AND NOT senior',
      'desarrollador AND (react OR javascript) AND "hasta 2 años"',

      // Variaciones con tecnologías y experiencia
      '(react OR nextjs OR typescript) AND developer AND ("1-2 years" OR "2 years max")',
      '(javascript OR typescript) AND frontend AND "1-2 years"',

      // Búsquedas específicas de nivel
      '(Frontend OR "Front End") AND (Developer OR Engineer) AND "1-2 years experience"',
      'Developer AND Web AND ("hasta 2 años" OR "1-2 years") AND NOT Senior',

      // Combinaciones con ubicación
      '(desarrollador OR developer) AND (frontend OR "front end") AND (tucuman OR argentina) AND "1-2 años"',

      // Otras variaciones relevantes
      'frontend AND (developer OR desarrollador) AND (remote OR remoto) AND "1-2 years"',
      '(javascript OR react) AND developer AND remote AND ("1-2 years" OR "2 years max")',
      'Developer AND (Frontend OR "Front End") AND NOT (Senior OR "3+ years") AND (Remote OR Argentina)',
    ];
  }

  async scrapeLinkedIn() {
    try {
      const browser = await puppeteer.launch({
        headless: false,
        args: [
          "--disable-blink-features=AutomationControlled",
          "--start-maximized",
          "--window-position=0,0",
        ],
        defaultViewport: null,
      });
      const page = await browser.newPage();
      await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, "webdriver", { get: () => false });
      });

      const cookiesPath = path.join(process.cwd(), "cookies.json");

      // Verificar si ya existen cookies guardadas
      try {
        const cookiesString = await fs.readFile(cookiesPath, "utf-8");
        const cookies = JSON.parse(cookiesString);
        await page.setCookie(...cookies);
        console.log("Cookies cargadas exitosamente.");
      } catch {
        console.log("No se encontraron cookies, iniciando sesión.");
      }

      await page.goto("https://www.linkedin.com/");

      // Verificar si ya estamos logueados
      try {
        await page.waitForSelector("img.global-nav__me-photo", {
          timeout: 5000,
        });
        console.log("Sesión iniciada con cookies.");
      } catch (error) {
        console.log("Iniciando sesión...");
        await page.goto("https://www.linkedin.com/login");
        await page.type("#username", process.env.LINKEDIN_EMAIL, {
          delay: 100,
        });
        await page.type("#password", process.env.LINKEDIN_PASSWORD, {
          delay: 100,
        });
        await page.click('button[type="submit"]');

        const cookies = await page.cookies();
        await fs.writeFile(cookiesPath, JSON.stringify(cookies, null, 2));
        console.log("Cookies guardadas correctamente.");
      }

      const searchQueries = this.generateSearchQueries();
      const shuflledQueries = searchQueries
        .sort(() => Math.random() - 0.5)
        .slice(0, 8); // Seleccionar 3 queries aleatorias para aumentar la diversidad
      const allJobs = [];
      let counter = 0;

      for (const query of shuflledQueries) {
        console.log(`Buscando trabajos con query: ${query}`);

        await page.goto("https://www.linkedin.com/jobs/");

        await page.waitForSelector(".jobs-search-box__text-input"); // Esperar a que se cargue la barra de búsqueda

        await page.type(".jobs-search-box__text-input", query, { delay: 100 }); // Ingresar la query

        await page.keyboard.press("Enter"); // Presionar la tecla Enter para iniciar la búsqueda

        // Esperar a que se carguen los resultados
        await page.waitForSelector(
          "li[data-occludable-job-id]:not(.jobs-search-results__job-card--is-collapsed)"
        );

        console.log("Búsqueda realizada y resultados cargados.");

        const jobs = await page.evaluate(() => {
          const jobElements = document.querySelectorAll(
            "li[data-occludable-job-id]"
          );

          console.log(
            `Encontrados ${jobElements.length} trabajos con esta query`
          );

          return Array.from(jobElements).map((el) => ({
            title: el
              .querySelector(".job-card-list__title a")
              ?.textContent.trim(),
            company: el
              .querySelector(".artdeco-entity-lockup__subtitle span")
              ?.textContent.trim(),
            location: el
              .querySelector(".job-card-container__metadata-wrapper li span")
              ?.textContent.trim(),
            url: el.querySelector(".job-card-list__title a")?.href,
          }));
        });

        allJobs.push(...jobs);
        console.log(`Encontrados ${jobs.length} trabajos con esta query`);
      }

      await browser.close();
      return this.removeDuplicateJobs(allJobs);
    } catch (error) {
      console.error("Error scrapeando LinkedIn:", error);
      return [];
    }
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

  async analyzeJobCompatibility(job) {
    const model = this.lmstudio("llama-3.2-1b");

    const prompt = `
En base al siguiente perfil de desarrollador:
${JSON.stringify(userProfile, null, 2)}

y a la siguiente oferta de trabajo:
${JSON.stringify(job, null, 2)}

Realizar un análisis detallado de la oferta de trabajo y determinar si el desarrollador se adecuaría a la oferta para que luego el desarrollador pueda aplicar.

El análisis debe tener en cuenta las siguientes aspectos:
- Habilidades y competencias requeridas
- Experiencia requerida
- Nivel de inglés
- Modalidad de trabajo
- Salario
- Ubicación
- Tipo de trabajo

El análisis debe tener en cuenta las siguientes ponderaciones:
- Habilidades y competencias: 0.4
- Experiencia: 0.3
- Nivel de inglés: 0.1
- Modalidad de trabajo: 0.1
- Salario: 0.1
- Ubicación: 0.1
- Tipo de trabajo: 0.1

La respuesta debe tener el siguiente formato:
Compatibilidad Total: [0-100]%
`;
    try {
      const { text } = await generateText({
        model,
        prompt,
      });
      return text;
    } catch (error) {
      console.error("Error en análisis:", error);
      return "No se pudo realizar el análisis detallado.";
    }
  }

  async generateJobReport(jobs) {
    const jobAnalyses = [];

    for (const job of jobs) {
      const analysis = await this.analyzeJobCompatibility(job); // el modelo analiza la compatibilidad de cada oferta
      jobAnalyses.push({ ...job, analysis });
    }

    // Ordenar por compatibilidad
    jobAnalyses.sort((a, b) => {
      const matchA = parseInt(
        a.analysis.match(/Compatibilidad Total: (\d+)%/)?.[1] || "0"
      );
      const matchB = parseInt(
        b.analysis.match(/Compatibilidad Total: (\d+)%/)?.[1] || "0"
      );
      return matchB - matchA;
    });

    const reportContent = jobAnalyses
      .slice(0, 10)
      .map(
        (job) => `
## ${job.title} - ${job.company}

### Análisis de Compatibilidad
${job.analysis}

[Ver Oferta](${job.url})
    `
      )
      .join("\n\n");

    await fs.writeFile(
      path.join(process.cwd(), "JOB_ANALYSIS_REPORT.md"),
      `# Análisis de Ofertas de Trabajo

## Mejores Ofertas para ${userProfile.nombre}

${reportContent}

*Informe generado automáticamente*`
    );
  }

  async run() {
    const linkedInJobs = await this.scrapeLinkedIn();

    console.log(`Total de ofertas encontradas: ${linkedInJobs.length}`);
    await this.generateJobReport(linkedInJobs);
  }
}

// Ejecutar scraper
const scraper = new JobScraper();
scraper.run().catch(console.error);
