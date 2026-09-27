// The two tools the coaching AI is allowed to use to ground its answers.
// Neither returns anything the model couldn't get by querying the database
// directly -- that's the point. The model selects and explains; it never
// recalls exercise facts from its own memory.
import type Anthropic from "@anthropic-ai/sdk";
import type { Lang } from "../auth.js";
import { prisma } from "../db.js";
import { loadExerciseDetail, pick } from "../mappers.js";

export const CHAT_TOOLS: Anthropic.Tool[] = [
  {
    name: "search_exercises",
    description:
      "Busca en la base de conocimiento de ejercicios por cualidad fisica, musculo objetivo, o equipamiento disponible. Llama a esta herramienta antes de recomendar cualquier ejercicio -- nunca recomiendes uno que no hayas encontrado aqui primero.",
    input_schema: {
      type: "object",
      properties: {
        physicalQuality: {
          type: "string",
          description: "p.ej. Potencia, Fuerza maxima, Fuerza explosiva, Estabilidad, Coordinacion, Equilibrio, Resistencia",
        },
        muscle: {
          type: "string",
          description: "p.ej. Gluteos, Oblicuos, Cuadriceps",
        },
        equipmentAvailable: {
          type: "array",
          items: { type: "string" },
          description:
            "Equipamiento que el usuario tiene disponible ahora mismo. Si se omite, no se filtra por equipamiento.",
        },
        maxResults: { type: "integer" },
      },
    },
  },
  {
    name: "get_exercise_detail",
    description:
      "Obtiene el objeto de conocimiento completo de un ejercicio por su id: objetivo, cualidades fisicas, musculos, contraindicaciones, claves de coaching, nivel de evidencia, variaciones (progresiones/regresiones/alternativas ya conectadas) y transferencia al deporte. Usa esto antes de explicar el 'porque' de un ejercicio o de sugerir una alternativa.",
    input_schema: {
      type: "object",
      properties: {
        exerciseId: { type: "string" },
      },
      required: ["exerciseId"],
    },
  },
];

export interface SearchExercisesInput {
  physicalQuality?: string;
  muscle?: string;
  equipmentAvailable?: string[];
  maxResults?: number;
}

export async function searchExercises(input: SearchExercisesInput, lang: Lang = "es") {
  const equipmentAvailable = input.equipmentAvailable;

  const exercises = await prisma.exercise.findMany({
    where: {
      ...(input.physicalQuality
        ? {
            physicalQualities: {
              some: { quality: { name: { contains: input.physicalQuality, mode: "insensitive" } } },
            },
          }
        : {}),
      ...(input.muscle
        ? {
            muscles: {
              some: { muscle: { name: { contains: input.muscle, mode: "insensitive" } } },
            },
          }
        : {}),
      ...(equipmentAvailable && equipmentAvailable.length > 0
        ? {
            equipment: {
              none: {
                required: true,
                equipment: { name: { notIn: equipmentAvailable } },
              },
            },
          }
        : {}),
    },
    take: input.maxResults ?? 8,
    select: {
      id: true,
      name: true,
      nameEn: true,
      objective: true,
      objectiveEn: true,
      contraindications: true,
      contraindicationsEn: true,
    },
  });

  return exercises.map((e) => ({
    id: e.id,
    name: pick(lang, e.name, e.nameEn),
    objective: pick(lang, e.objective, e.objectiveEn),
    contraindications: pick(lang, e.contraindications, e.contraindicationsEn),
  }));
}

export async function getExerciseDetailTool(exerciseId: string, lang: Lang = "es") {
  const exercise = await loadExerciseDetail(exerciseId, lang);
  if (!exercise) return { error: `No exercise found with id ${exerciseId}` };
  return exercise;
}
