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

  generateSearchQueriesPublished() {
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

  generateSearchQueriesJobsSearched() {
    const queries = [
      "Frontend Developer",
      "React Developer",
      "JavaScript Developer",
      "TypeScript Developer",
      "Full Stack Developer",
      "Back End Developer",
      "Node.js Developer",
      "Express Developer",
      "Laravel Developer",
      "PHP Developer",
      "Next.js Developer",
      "Fullstack Developer",
      "Full stack developer",
      "Desarrollador Frontend",
      "Desarrollador React",
      "Desarrollador JavaScript",
      "Desarrollador TypeScript",
      "Desarrollador Full Stack",
      "Desarrollador Back End",
      "Desarrollador Node.js",
      "Desarrollador Express",
      "Desarrollador Laravel",
      "Desarrollador PHP",
      "Desarrollador Next.js",
      "Desarrollador Fullstack",
      "Desarrollador Full stack",
      "Desarrollador de Frontend",
      "Desarrollador de React",
      "Desarrollador de JavaScript",
      "Desarrollador de TypeScript",
      "Desarrollador de Full Stack",
      "Desarrollador de Back End",
      "Desarrollador de Node.js",
      "Desarrollador de Express",
      "Front-end Developer",
      "React.js Developer",
      "JavaScript Developer",
      "TypeScript Developer",
      "Full Stack Developer",
      "Back-end Developer",
      "Node.js Developer",
      "Express Developer",
      "Laravel Developer",
      "PHP Developer",
      "Next.js Developer",
      "Fullstack Developer",
      "Full stack developer",
      "Desarrollador Frontend",
      "Junios de Frontend",
      "React mid level Developer",
      "JavaScript mid level Developer",
      "TypeScript mid level Developer",
      "Full Stack mid level Developer",
      "Back-end mid level Developer",
      "Node.js mid level Developer",
      "Express mid level Developer",
      "Laravel mid level Developer",
      "PHP mid level Developer",
      "Next.js mid level Developer",
      "Fullstack mid level Developer",
      "Full stack mid level developer",
      "Desarrollador Frontend",
      "Desarrollador React",
      "Desarrollador JavaScript",
    ];

    // Eliminar duplicados utilizando un Set
    return [...new Set(queries)];
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

      const searchQueries = this.generateSearchQueriesJobsSearched();
      const shuflledQueries = searchQueries
        .sort(() => Math.random() - 0.5)
        .slice(0, 5);
      const allJobs = [];

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

        const jobs = await page.evaluate(async () => {
          const jobElements = document.querySelectorAll(
            "li[data-occludable-job-id]"
          );
          const detailedJobs = [];

          for (let el of jobElements) {
            const jobTitle = el
              .querySelector(".job-card-list__title a")
              ?.textContent.trim();
            const jobCompany = el
              .querySelector(".artdeco-entity-lockup__subtitle span")
              ?.textContent.trim();
            const jobLocation = el
              .querySelector(".job-card-container__metadata-wrapper li span")
              ?.textContent.trim();
            const jobUrl = el.querySelector(".job-card-list__title a")?.href;

            console.log(
              `Encontrado trabajo: ${jobTitle} - ${jobCompany} - ${jobLocation} - ${jobUrl}`
            );

            // Hacer clic en el enlace del título para cargar el detalle
            const link = el.querySelector(".job-card-list__title a");
            if (link) {
              await link.click();

              // Esperar a que se carguen los detalles
              await page.waitForSelector(".jobs-description__container", {
                visible: true,
              });

              // Extraer los detalles de la página de trabajo
              const jobDescription = await page.evaluate(() => {
                const descriptionElement = document.querySelector(
                  ".jobs-description__content .jobs-box__html-content"
                );
                return descriptionElement
                  ? descriptionElement.textContent.trim()
                  : "Descripción no disponible";
              });

              detailedJobs.push({
                title: jobTitle,
                company: jobCompany,
                location: jobLocation,
                url: jobUrl,
                description: jobDescription,
              });
            }
          }

          return detailedJobs;
        });

        allJobs.push(...jobs);
        console.log(`Encontrados ${jobs.length} trabajos con esta query`);
      }

      console.log({
        allJobs,
      });

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

-Realizar un análisis detallado de la oferta de trabajo y determinar si el desarrollador se adecuaría a la oferta para que luego el desarrollador pueda aplicar.

-El analisis para que el desarrollador pueda aplicar debe tener en cuenta las siguientes aspectos:
- Habilidades y competencias requeridas
- Experiencia requerida
- Nivel de inglés
- Modalidad de trabajo
- Salario
- Ubicación
- Tipo de trabajo

-La oferta puede no contener todas las características mencionadas anteriormente.
-El desarrollador puede no contener todas las características mencionadas anteriormente.

-Si la oferta esta en ingles revisar si el desarrollador tambien puede comunicarse en el nivel de ingles que la oferta requiere. De no serlo, responder con 0% de compatibilidad total

-La respuesta debe tener el siguiente formato:
 Compatibilidad Total: [0-100]%

## IMPORTANTE ##
-SOLO RESPONDER CON EL PORCENTAJE DE COMPATIBILIDAD TOTAL Y NINGÚN OTRO TEXTO ADICIONAL
-NO RESPONDER CON UNA RESPUESTA DE "SI" O "NO"
-RESPONDER CON EL PORCENTAJE DE COMPATIBILIDAD TOTAL

-Ejemplo de respuesta:
Compatibilidad Total: 80%

`;
    try {
      const { text } = await generateText({
        model,
        prompt,
      });
      const match = parseInt(
        text.match(/Compatibilidad Total: (\d+)%/)?.[1] || "0"
      );
      return { ...job, match }; // Retornamos la oferta con el match incluido
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

    // Ordenar las ofertas por compatibilidad
    jobAnalyses.sort((a, b) => b.match - a.match);

    // Crear el directorio de resultados si no existe
    const resultsDir = "resultados_busqueda";
    await fs.mkdir(resultsDir, { recursive: true });

    // Generar nombre de archivo con fecha y hora
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-"); // Genera el formato con guiones
    const filename = path.join(resultsDir, `README_${timestamp}.md`);

    // Escribir el archivo README
    let reportContent = `# Búsqueda de Empleos LinkedIn 🚀\n\n`;
    reportContent += `*Búsqueda realizada el ${new Date().toLocaleDateString()} a las ${new Date().toLocaleTimeString()}*\n\n`;

    reportContent += "## 🔍 Criterios de Búsqueda\n\n";
    reportContent += `- **Términos de búsqueda:** \`[tu búsqueda aquí]\`\n`;
    reportContent += `- **Ubicación:** \`${userProfile.location}\`\n\n`;

    reportContent += "### ⚙️ Filtros Aplicados\n\n";
    reportContent += "- ✅ Solo trabajos publicados en la última semana\n";
    reportContent += "- 🗣️ Solo ofertas en español\n";
    reportContent +=
      "- 🚫 Excluidos: Trabajos con más de 2 años de experiencia, trabajos en .NET, C++, o C#\n\n";

    if (jobAnalyses.length === 0) {
      reportContent += "## ❌ No se encontraron ofertas\n\n";
      reportContent +=
        "No se encontraron ofertas de trabajo que coincidan con los criterios especificados.\n";
    } else {
      reportContent += `## 📊 Resultados (${jobAnalyses.length} ofertas encontradas)\n\n`;

      reportContent += "| Empresa | Puesto | Match | Ubicación | Link |\n";
      reportContent += "|---------|--------|-------|-----------|------|\n";

      jobAnalyses.forEach((job) => {
        reportContent += `| ${job.company} | ${job.title} | ${job.match}% | ${job.location} | [Ver oferta](${job.url}) |\n`;
      });

      reportContent += "\n## 📝 Detalles de las Ofertas\n\n";

      jobAnalyses.forEach((job, idx) => {
        reportContent += `### ${idx + 1}. ${job.title}\n\n`;
        reportContent += `**🏢 Empresa:** ${job.company}\n\n`;
        reportContent += `**📍 Ubicación:** ${job.location}\n\n`;
        reportContent += `**🎯 Coincidencia:** ${job.match}%\n\n`;
        reportContent += `**🔗 [Ver oferta completa](${job.url})**\n\n`;
        reportContent += "---\n\n";
      });
    }

    await fs.writeFile(filename, reportContent, "utf-8");

    console.log(`[+] Resultados guardados en: ${filename}`);
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
