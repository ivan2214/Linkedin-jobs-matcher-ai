import fs from "fs/promises";
import path from "path";
import { userProfile } from "../profile.js";

export async function generateJobReport(jobAnalyses) {
  // Ordenar las ofertas por compatibilidad
  jobAnalyses.sort((a, b) => b.match - a.match);

  // Crear el directorio de resultados si no existe
  const resultsDir = "resultados_busqueda";
  await fs.mkdir(resultsDir, { recursive: true });

  // Generar nombre de archivo con fecha y hora
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
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
      reportContent += `| ${job.company} | ${job.title} | ${job.match}% | ${job.location} | [Ver oferta](${job.link}) |\n`;
    });

    reportContent += "\n## 📝 Detalles de las Ofertas\n\n";

    jobAnalyses.forEach((job, idx) => {
      reportContent += `### ${idx + 1}. ${job.title}\n\n`;
      reportContent += `**🏢 Empresa:** ${job.company}\n\n`;
      reportContent += `**📍 Ubicación:** ${job.location}\n\n`;
      reportContent += `**🎯 Coincidencia:** ${job.match}%\n\n`;
      reportContent += `**🔗 [Ver oferta completa](${job.link})**\n\n`;
      reportContent += "---\n\n";
    });
  }

  await fs.writeFile(filename, reportContent, "utf-8");

  console.log(`[+] Resultados guardados en: ${filename}`);
}
