import { type LanguageModel, generateText } from "ai";

import { userProfile } from "../profile.js";
import type { JobBrowser } from "./browserService.js";

export interface JobResponseAI {
	title: string;
	company: string;
	location: string;
	description: string;
	url: string;
	match: number;
}

export async function analyzeJobCompatibility(
	model: LanguageModel,
	linkedInJobs: JobBrowser[],
): Promise<JobResponseAI[]> {
	const jobsString = linkedInJobs
		.map((job, index) => {
			return `
      Oferta ${index + 1}:
      Título: ${job.title}
      Empresa: ${job.company}
      Ubicación: ${job.location}
      Descripción: ${job.description}
      URL: ${job.url}
      `;
		})
		.join("\n");

	const prompt = `
		# IMPORTANTE #
		- RESPONDE SOLO EN FORMATO JSON COMO EL EJEMPLO
		- NO USES EL SÍMBOLO "%" EN LOS NÚMEROS
		- NO EXPLIQUES NADA
		- SOLO RESPONDE EN EL SIGUIENTE FORMATO:
		
		{ "Compatibilidad Total": 80, "Oferta": 1 }
		{ "Compatibilidad Total": 75, "Oferta": 2 }
		{ "Compatibilidad Total": 60, "Oferta": 3 }
		
		# PERFIL DEL DESARROLLADOR #
		${JSON.stringify(userProfile, null, 2)}
		
		# OFERTAS DE TRABAJO #
		${jobsString}
		
		# FILTROS #
		- Solo ofertas en español.
		- Excluir trabajos con más de 2 años de experiencia, y en .NET, C++, C#, Java, Wordpress, React Native, Angular, Vue, Ruby.
		- Solo devolver ofertas con más del 60% de compatibilidad.
		
		# RESPONDE SOLO EN EL FORMATO INDICADO #
		`;

	try {
		const { text } = await generateText({
			model,
			prompt,
		});

		console.log("Respuesta cruda de la IA:", text); // Agregado para depurar

		const cleanText = text.replace(/%/g, ""); // Eliminar el símbolo %
		console.log("Respuesta limpia:", cleanText);

		const matches = [...cleanText.matchAll(/\{[^}]+\}/g)]
			.map((match) => {
				try {
					return JSON.parse(match[0]);
				} catch (e) {
					console.warn("Error al parsear JSON:", match[0]);
					return null;
				}
			})
			.filter((match) => match && match["Compatibilidad Total"] > 60);

		const results = linkedInJobs
			.map((job, index) => {
				const match =
					matches.find((m) => m.Oferta === index + 1)?.[
						"Compatibilidad Total"
					] || 0;
				return { ...job, match };
			})
			.filter((job) => job.match > 60);

		console.log({ results });

		return results;
	} catch (error) {
		console.error("Error en análisis:", error);
		return linkedInJobs
			.map((job) => ({ ...job, match: 0 }))
			.filter((job) => job.match > 60);
	}
}
