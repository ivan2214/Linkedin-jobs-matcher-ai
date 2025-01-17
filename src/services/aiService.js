import { generateText } from "ai";
import { userProfile } from "../profile.js";

export async function analyzeJobCompatibility(job, model) {
  const prompt = `En base al siguiente perfil de desarrollador:
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

-Si la oferta esta en ingles revisar si el desarrollador tambien puede comunicarse en el nivel de ingles que la oferta requiere. De no serlo, responder con 0% de compatibilidad total y decir que se encuentra en ingles.

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
