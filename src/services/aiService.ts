import { generateText, LanguageModel } from "ai";

import { userProfile } from "../profile.js";
import { OpenAICompatibleProvider } from "@ai-sdk/openai-compatible";
import { JobBrowser } from "./browserService.js";

export interface JobResponseAI {
  title: string;
  company: string;
  location: string;
  description: string;
  url: string;
  match: number;
}

export async function analyzeJobCompatibility(model:LanguageModel, jobDescription: JobBrowser
): Promise<JobResponseAI> {
  const prompt = `En base al siguiente perfil de desarrollador:
${JSON.stringify(userProfile, null, 2)}

y a la siguiente oferta de trabajo:
${JSON.stringify(jobDescription, null, 2)}

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

-Si la oferta esta en ingles revisar si el desarrollador tambien puede comunicarse en el nivel de ingles que la oferta requiere. De no serlo, responder con 0% de compatibilidad total y decir que se encuentra en ingles.

-La respuesta debe tener el siguiente formato:
 Compatibilidad Total: [0-100]%

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
    return { ...jobDescription, match }; // Retornamos la oferta con el match incluido
  } catch (error) {
    console.error("Error en análisis:", error);
    return { ...jobDescription, match: 0 };
  }
}
