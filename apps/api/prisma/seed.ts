// Seed data transcribed from real screenshots of "julio y el resto"
// (20/07/2026 - 31/07/2026). Every exercise name, rep scheme, and round
// count below was read directly from a screenshot — nothing here is
// invented to fill a gap.
//
// KNOWN GAPS (screenshots not yet shared, or not yet reviewed):
//   - Dia 1, Bloque 1: not seeded (no screenshot seen)
//   - Dia 1, Bloque 2: only its 2nd exercise is seeded (1st exercise's name
//     was cut off in the screenshot, only "12 y 12" was visible)
//   - Dia 2, Bloque 1: not seeded (no screenshot seen)
//   - Dia 2, Bloque 2: only its 2nd exercise is seeded (1st exercise's name
//     was cut off, only "5" was visible)
//   - Dia 4, Bloque 1: not seeded (no screenshot seen)
//   - Mov Prep: session exists but has zero blocks (its 3 exercises were
//     never shown to us, only the count)
// Dia 3 is fully confirmed across two overlapping screenshots.
//
// Send the missing screenshots and these can be filled in without
// restructuring anything else.
//
// ENGLISH TRANSLATIONS (*_En fields below): a faithful, careful pass over
// this program's own text -- exercise-science terminology and plain
// instructional copy, not invented facts. Machine-drafted by this session
// (not yet a separate human/coach review pass -- see PROJECT_STATE.md's
// note on translation provenance), so worth a spot-check before treating
// it as final, the same caution that already applied to every other
// translated field in this codebase.

import { prisma } from "../src/db.js";
import type { Emphasis, EvidenceRating } from "../src/generated/prisma/enums.js";

// Spanish -> English lookups for the shared taxonomy entities (physical
// qualities, muscles, equipment). These are referenced by their Spanish
// name throughout EXERCISES below; keeping the translation in one map per
// entity type (rather than repeating it at every reference) is what keeps
// this maintainable -- translate a term once, it's correct everywhere it's
// used.
const QUALITY_EN: Record<string, string> = {
  "Estabilidad": "Stability",
  "Fuerza maxima": "Maximal strength",
  "Potencia": "Power",
  "Fuerza explosiva": "Explosive strength",
  "Resistencia": "Endurance",
  "Coordinacion": "Coordination",
  "Equilibrio": "Balance",
};

const MUSCLE_EN: Record<string, { name: string; group?: string }> = {
  "Recto abdominal": { name: "Rectus abdominis", group: "Core" },
  "Aductores": { name: "Adductors", group: "Hip" },
  "Gluteos": { name: "Glutes", group: "Hip" },
  "Cuadriceps": { name: "Quadriceps", group: "Legs" },
  "Isquiotibiales": { name: "Hamstrings", group: "Legs" },
  "Erectores espinales": { name: "Erector spinae", group: "Back" },
  "Deltoides": { name: "Deltoids", group: "Shoulders" },
  "Trapecio": { name: "Trapezius", group: "Back" },
  "Oblicuos": { name: "Obliques", group: "Core" },
  "Dorsal ancho": { name: "Latissimus dorsi", group: "Back" },
  "Antebrazos": { name: "Forearms", group: "Arms" },
};

const EQUIPMENT_EN: Record<string, string> = {
  "Banda elastica": "Resistance band",
  "Landmine": "Landmine",
  "Barra": "Barbell",
  "Kettlebell": "Kettlebell",
  "Mancuerna": "Dumbbell",
  "Balon medicinal": "Medicine ball",
  "Peso corporal": "Bodyweight",
  "Rack de sentadilla": "Squat rack",
};

const SPORT_EN: Record<string, string> = {
  "Padel": "Padel",
};

async function upsertSport(name: string) {
  const nameEn = SPORT_EN[name];
  return prisma.sport.upsert({
    where: { name },
    update: { nameEn },
    create: { name, nameEn },
  });
}

async function upsertQuality(name: string) {
  const nameEn = QUALITY_EN[name];
  return prisma.physicalQuality.upsert({
    where: { name },
    update: { nameEn },
    create: { name, nameEn },
  });
}

async function upsertMuscle(name: string, muscleGroup?: string) {
  const en = MUSCLE_EN[name];
  return prisma.muscle.upsert({
    where: { name },
    update: { nameEn: en?.name, muscleGroupEn: en?.group },
    create: { name, muscleGroup, nameEn: en?.name, muscleGroupEn: en?.group },
  });
}

async function upsertEquipment(name: string) {
  const nameEn = EQUIPMENT_EN[name];
  return prisma.equipment.upsert({
    where: { name },
    update: { nameEn },
    create: { name, nameEn },
  });
}

interface QualityTag {
  name: string;
  emphasis?: Emphasis;
}
interface MuscleTag {
  name: string;
  group?: string;
  emphasis?: Emphasis;
}
interface EquipmentTag {
  name: string;
  required?: boolean;
}
interface SportTransferSeed {
  sport: string;
  description: string;
  descriptionEn?: string;
  evidenceRating: EvidenceRating;
}

interface ExerciseSeed {
  name: string;
  nameEn?: string;
  aliases?: string[];
  objective: string;
  objectiveEn?: string;
  movementComplexity?: string;
  movementComplexityEn?: string;
  contraindications?: string;
  contraindicationsEn?: string;
  coachingCues?: string;
  coachingCuesEn?: string;
  evidenceRating?: EvidenceRating;
  qualities?: QualityTag[];
  muscles?: MuscleTag[];
  equipment?: EquipmentTag[];
  sportTransfer?: SportTransferSeed;
}

// The five marked FULL are richly authored end to end (the depth every
// exercise should eventually reach). The rest have a real objective and at
// least one physical quality / muscle / equipment tag, but not the full
// treatment — that's an honest scope choice, not a shortcut being hidden.
const EXERCISES: ExerciseSeed[] = [
  {
    name: "Deadbug + Aduccion + Glute Bridge con Banda de Cadera",
    nameEn: "Deadbug + Adduction + Glute Bridge with Hip Band",
    aliases: ["deadbug + add + glute bridge con goma cadera"],
    objective:
      "Activar y controlar la cadena core-cadera antes del trabajo de fuerza principal: control anti-extension (deadbug), aduccion de cadera bajo tension de banda, y extension de cadera (glute bridge).",
    objectiveEn:
      "Activate and control the core-hip chain before the main strength work: anti-extension control (deadbug), hip adduction under band tension, and hip extension (glute bridge).",
    qualities: [{ name: "Estabilidad", emphasis: "primary" }],
    muscles: [
      { name: "Recto abdominal", group: "Core", emphasis: "primary" },
      { name: "Aductores", group: "Cadera", emphasis: "primary" },
      { name: "Gluteos", group: "Cadera", emphasis: "secondary" },
    ],
    equipment: [{ name: "Banda elastica" }],
  },
  {
    name: "Landmine Drop Split Squat",
    objective:
      "Fuerza unilateral de tren inferior con el patron landmine, que reduce la carga axial en la columna frente a un back squat cargado, permitiendo volumen de pierna con menor fatiga espinal.",
    objectiveEn:
      "Unilateral lower-body strength using the landmine pattern, which reduces axial spinal load compared to a loaded back squat, allowing leg volume with less spinal fatigue.",
    qualities: [
      { name: "Fuerza maxima", emphasis: "primary" },
      { name: "Estabilidad", emphasis: "secondary" },
    ],
    muscles: [
      { name: "Cuadriceps", group: "Piernas", emphasis: "primary" },
      { name: "Gluteos", group: "Cadera", emphasis: "primary" },
    ],
    equipment: [{ name: "Landmine" }, { name: "Barra" }],
  },
  {
    // FULL
    name: "Kettlebell Swing",
    objective:
      "Desarrollar potencia de cadera mediante un patron balistico de bisagra de cadera: extension explosiva de cadera bajo carga externa moderada.",
    objectiveEn:
      "Develop hip power through a ballistic hip-hinge pattern: explosive hip extension under moderate external load.",
    movementComplexity:
      "Moderada — el patron de hinge debe dominarse antes de anadir velocidad.",
    movementComplexityEn:
      "Moderate — the hinge pattern must be mastered before adding speed.",
    contraindications:
      "Dolor lumbar agudo; hernia discal no resuelta (la extension balistica de cadera bajo carga sobrecarga la zona lumbar si el hinge es defectuoso).",
    contraindicationsEn:
      "Acute low back pain; unresolved disc herniation (ballistic hip extension under load overloads the lower back if the hinge is faulty).",
    coachingCues:
      "La potencia sale de la cadera, no de los brazos — los brazos son solo una cuerda. Carga el gluteo antes de proyectar. No flexiones la zona lumbar.",
    coachingCuesEn:
      "The power comes from the hip, not the arms — the arms are just a rope. Load the glute before projecting. Don't flex the lower back.",
    evidenceRating: "moderate",
    qualities: [
      { name: "Potencia", emphasis: "primary" },
      { name: "Fuerza explosiva", emphasis: "secondary" },
    ],
    muscles: [
      { name: "Gluteos", group: "Cadera", emphasis: "primary" },
      { name: "Isquiotibiales", group: "Piernas", emphasis: "primary" },
      { name: "Erectores espinales", group: "Espalda", emphasis: "secondary" },
    ],
    equipment: [{ name: "Kettlebell" }],
    sportTransfer: {
      sport: "Padel",
      description:
        "Entrena la extension explosiva de cadera que contribuye a la potencia generada desde el suelo en golpes de padel, especialmente la vibora y el remate.",
      descriptionEn:
        "Trains the explosive hip extension that contributes to ground-up power in padel shots, especially the vibora and the smash.",
      evidenceRating: "moderate",
    },
  },
  {
    // FULL — appears in both Dia 1 and Dia 4, same canonical record
    name: "Landmine Halfmoon Press",
    objective:
      "Press de hombro unilateral en trayectoria de arco (landmine), que reduce la compresion articular del hombro frente a un press militar recto, entrenando fuerza de empuje y anti-rotacion de core.",
    objectiveEn:
      "Unilateral shoulder press in an arcing (landmine) path, which reduces shoulder-joint compression compared to a straight military press, training pressing strength and core anti-rotation.",
    movementComplexity: "Moderada",
    movementComplexityEn: "Moderate",
    contraindications:
      "Pinzamiento subacromial activo o dolor de hombro agudo — sigue siendo una carga de empuje, aunque mas amigable que un press recto.",
    contraindicationsEn:
      "Active subacromial impingement or acute shoulder pain — it's still a pressing load, even if more shoulder-friendly than a straight press.",
    coachingCues:
      "Sigue el arco natural de la barra, no fuerces una trayectoria recta. Mantén el core rigido — no dejes que la cadera rote con el brazo.",
    coachingCuesEn:
      "Follow the bar's natural arc, don't force a straight path. Keep the core rigid — don't let the hip rotate with the arm.",
    evidenceRating: "limited",
    qualities: [
      { name: "Fuerza maxima", emphasis: "primary" },
      { name: "Estabilidad", emphasis: "secondary" },
    ],
    muscles: [
      { name: "Deltoides", group: "Hombros", emphasis: "primary" },
      { name: "Trapecio", group: "Espalda", emphasis: "secondary" },
      { name: "Recto abdominal", group: "Core", emphasis: "secondary" },
    ],
    equipment: [{ name: "Landmine" }, { name: "Barra" }],
    sportTransfer: {
      sport: "Padel",
      description:
        "Fuerza de empuje de hombro en un patron mas seguro para un atleta que ya acumula mucho volumen de golpes por encima de la cabeza (remate, saque).",
      descriptionEn:
        "Shoulder pressing strength in a safer pattern for an athlete who already accumulates a lot of overhead-hitting volume (smash, serve).",
      evidenceRating: "limited",
    },
  },
  {
    name: "Deadbug to Lateral Plank con KTB",
    nameEn: "Deadbug to Lateral Plank with KB",
    aliases: ["desdbug to lateral plank ktb"],
    objective:
      "Transicion de control anti-extension (deadbug) a estabilidad lateral de core (plancha lateral) bajo carga anadida de kettlebell.",
    objectiveEn:
      "Transition from anti-extension control (deadbug) to lateral core stability (side plank) under added kettlebell load.",
    qualities: [{ name: "Estabilidad", emphasis: "primary" }],
    muscles: [
      { name: "Recto abdominal", group: "Core", emphasis: "primary" },
      { name: "Oblicuos", group: "Core", emphasis: "primary" },
    ],
    equipment: [{ name: "Kettlebell" }],
  },
  {
    name: "Hang Staggered Muscle Snatch",
    objective:
      "Variante derivada del levantamiento olimpico que entrena la triple extension explosiva (tobillo-rodilla-cadera) con postura de pies escalonada, puente hacia patrones de potencia asimetrica.",
    objectiveEn:
      "An Olympic-lift-derived variant that trains explosive triple extension (ankle-knee-hip) with a staggered foot stance, a bridge toward asymmetric power patterns.",
    movementComplexity:
      "Alta — requiere base tecnica de levantamientos olimpicos.",
    movementComplexityEn:
      "High — requires an Olympic-lifting technical base.",
    qualities: [
      { name: "Fuerza explosiva", emphasis: "primary" },
      { name: "Potencia", emphasis: "primary" },
    ],
    muscles: [
      { name: "Gluteos", group: "Cadera", emphasis: "primary" },
      { name: "Isquiotibiales", group: "Piernas", emphasis: "primary" },
      { name: "Trapecio", group: "Espalda", emphasis: "secondary" },
    ],
    equipment: [{ name: "Barra" }],
  },
  {
    name: "DB Front Rack Step Up",
    objective:
      "Fuerza unilateral de tren inferior en step-up con carga anterior (front rack), exigiendo control de cadera y rodilla sobre una superficie elevada — transferible a la aceleracion y el primer paso.",
    objectiveEn:
      "Unilateral lower-body strength in a step-up with anterior (front-rack) loading, demanding hip and knee control over an elevated surface — transferable to acceleration and the first step.",
    qualities: [{ name: "Fuerza maxima", emphasis: "primary" }],
    muscles: [
      { name: "Cuadriceps", group: "Piernas", emphasis: "primary" },
      { name: "Gluteos", group: "Cadera", emphasis: "primary" },
    ],
    equipment: [{ name: "Mancuerna" }],
  },
  {
    // FULL — regression of the standing rotational throw below
    name: "Lanzamiento Lateral Medicine Ball en Tall Kneeling",
    nameEn: "Tall-Kneeling Lateral Medicine Ball Throw",
    aliases: ["lanzamiento lateral medball en tall knelling"],
    objective:
      "Aislar la rotacion de tronco en la produccion de potencia, eliminando la contribucion de piernas y cadera al fijar la postura en tall kneeling.",
    objectiveEn:
      "Isolate trunk rotation in power production, removing the leg and hip contribution by fixing the posture in tall kneeling.",
    movementComplexity: "Moderada",
    movementComplexityEn: "Moderate",
    contraindications:
      "Dolor lumbar agudo; pinzamiento de hombro no resuelto (carga rotacional balistica).",
    contraindicationsEn:
      "Acute low back pain; unresolved shoulder impingement (ballistic rotational load).",
    coachingCues:
      "Separa hombros de cadera antes de lanzar, aunque la cadera este fijada por la postura — la rotacion viene del tronco, no de los brazos.",
    coachingCuesEn:
      "Separate shoulders from hips before throwing, even though the hip is fixed by the posture — the rotation comes from the trunk, not the arms.",
    evidenceRating: "moderate",
    qualities: [{ name: "Potencia", emphasis: "primary" }],
    muscles: [
      { name: "Oblicuos", group: "Core", emphasis: "primary" },
      { name: "Dorsal ancho", group: "Espalda", emphasis: "secondary" },
    ],
    equipment: [{ name: "Balon medicinal" }],
    sportTransfer: {
      sport: "Padel",
      description:
        "Entrena la secuenciacion de rotacion de tronco aislada de la cadera — util para golpes en posiciones de piernas limitadas, como cerca de la pared.",
      descriptionEn:
        "Trains trunk-rotation sequencing isolated from the hip — useful for shots in limited-leg-drive positions, like close to the back wall.",
      evidenceRating: "moderate",
    },
  },
  {
    name: "Monopodal Rack Pull",
    nameEn: "Single-Leg Rack Pull",
    objective:
      "Fuerza unilateral de cadena posterior desde una altura elevada de barra (rack pull), reduciendo el rango de movimiento frente a un peso muerto completo mientras entrena control unilateral.",
    objectiveEn:
      "Unilateral posterior-chain strength from an elevated bar height (rack pull), reducing the range of motion compared to a full deadlift while training unilateral control.",
    qualities: [{ name: "Fuerza maxima", emphasis: "primary" }],
    muscles: [
      { name: "Isquiotibiales", group: "Piernas", emphasis: "primary" },
      { name: "Gluteos", group: "Cadera", emphasis: "primary" },
      { name: "Erectores espinales", group: "Espalda", emphasis: "secondary" },
    ],
    equipment: [{ name: "Barra" }, { name: "Rack de sentadilla" }],
  },
  {
    name: "Farmer's Walk Posterior",
    objective:
      "Transporte cargado que entrena fuerza de agarre, estabilidad de core y postura bajo fatiga acumulada — estimulo de fuerza general de bajo riesgo tecnico.",
    objectiveEn:
      "A loaded carry that trains grip strength, core stability, and posture under accumulated fatigue — a low-technical-risk general strength stimulus.",
    qualities: [{ name: "Resistencia", emphasis: "primary" }],
    muscles: [
      { name: "Antebrazos", group: "Brazos", emphasis: "primary" },
      { name: "Recto abdominal", group: "Core", emphasis: "secondary" },
    ],
    equipment: [{ name: "Mancuerna" }],
  },
  {
    name: "Drop Staggered Squat to Jump Staggered Squat",
    objective:
      "Pliometria reactiva: aterrizaje excentrico controlado desde una caida en posicion staggered, seguido de inmediato de un salto explosivo — entrena el ciclo estiramiento-acortamiento.",
    objectiveEn:
      "Reactive plyometrics: controlled eccentric landing from a drop in a staggered position, immediately followed by an explosive jump — trains the stretch-shortening cycle.",
    movementComplexity:
      "Alta — requiere buena capacidad de aterrizaje antes de progresar aqui.",
    movementComplexityEn:
      "High — requires good landing capacity before progressing here.",
    qualities: [{ name: "Fuerza explosiva", emphasis: "primary" }],
    muscles: [
      { name: "Cuadriceps", group: "Piernas", emphasis: "primary" },
      { name: "Gluteos", group: "Cadera", emphasis: "primary" },
    ],
    equipment: [{ name: "Peso corporal" }],
  },
  {
    name: "Drop Horizontal Switch Jump",
    objective:
      "Pliometria horizontal reactiva con cambio de pierna en el aire — entrena potencia horizontal y control de aterrizaje en el plano lateral, relevante para cambios de direccion.",
    objectiveEn:
      "Reactive horizontal plyometrics with a leg switch in the air — trains horizontal power and landing control in the lateral plane, relevant to changes of direction.",
    qualities: [{ name: "Fuerza explosiva", emphasis: "primary" }],
    muscles: [
      { name: "Cuadriceps", group: "Piernas", emphasis: "primary" },
      { name: "Aductores", group: "Cadera", emphasis: "secondary" },
    ],
    equipment: [{ name: "Peso corporal" }],
  },
  {
    name: "DB Overhead Isometric-Concentric Shoulder Press",
    objective:
      "Press de hombro con una fase isometrica sostenida seguida de fase concentrica — aumenta el tiempo bajo tension para el desarrollo de fuerza de hombro con demanda anadida de estabilidad.",
    objectiveEn:
      "A shoulder press with a sustained isometric phase followed by a concentric phase — increases time under tension for shoulder-strength development with added stability demand.",
    qualities: [{ name: "Fuerza maxima", emphasis: "primary" }],
    muscles: [{ name: "Deltoides", group: "Hombros", emphasis: "primary" }],
    equipment: [{ name: "Mancuerna" }],
  },
  {
    name: "Double Landmine Press",
    aliases: ["double lndmine press"],
    objective:
      "Press de hombro bilateral en el plano landmine, con la misma ventaja articular que la variante unilateral pero con demanda bilateral simultanea.",
    objectiveEn:
      "A bilateral shoulder press in the landmine plane, with the same joint advantage as the unilateral variant but with simultaneous bilateral demand.",
    qualities: [{ name: "Fuerza maxima", emphasis: "primary" }],
    muscles: [{ name: "Deltoides", group: "Hombros", emphasis: "primary" }],
    equipment: [{ name: "Landmine" }, { name: "Barra" }],
  },
  {
    name: "Hip Turn + Drop Step",
    objective:
      "Patron de pies especifico de deportes de raqueta: rotacion de cadera seguida de un paso hacia atras (drop step) — mecanica de arranque lateral para cubrir la pista.",
    objectiveEn:
      "A racket-sport-specific footwork pattern: hip rotation followed by a backward step (drop step) — lateral-start mechanics for covering the court.",
    qualities: [{ name: "Coordinacion", emphasis: "primary" }],
    muscles: [
      { name: "Gluteos", group: "Cadera", emphasis: "primary" },
      { name: "Aductores", group: "Cadera", emphasis: "secondary" },
    ],
    equipment: [{ name: "Peso corporal" }],
    sportTransfer: {
      sport: "Padel",
      description:
        "Es, literalmente, el patron de pies usado para iniciar un desplazamiento lateral hacia el fondo de la pista — la transferencia aqui es casi directa, no analogica.",
      descriptionEn:
        "It's literally the footwork pattern used to initiate a lateral move toward the back of the court — the transfer here is almost direct, not analogical.",
      evidenceRating: "strong",
    },
  },
  {
    // FULL — the clearest sport-transfer example in the whole program
    name: "Hip Turn + Shuffle",
    objective:
      "Patron de pies de deportes de raqueta: rotacion de cadera seguida de un desplazamiento lateral en shuffle — mecanica de cobertura lateral de pista.",
    objectiveEn:
      "A racket-sport footwork pattern: hip rotation followed by a lateral shuffle — lateral court-coverage mechanics.",
    movementComplexity: "Baja-moderada — tecnica de pies mas que carga.",
    movementComplexityEn: "Low-moderate — footwork technique rather than load.",
    contraindications:
      "Ninguna especifica mas alla de las limitaciones generales de tobillo/rodilla para trabajo lateral de alta velocidad.",
    contraindicationsEn:
      "None specific beyond general ankle/knee limitations for high-speed lateral work.",
    coachingCues:
      "Gira la cadera antes que los hombros. Mantén el centro de gravedad bajo durante el shuffle — no te incorpores.",
    coachingCuesEn:
      "Turn the hip before the shoulders. Keep your center of gravity low during the shuffle — don't stand up.",
    evidenceRating: "strong",
    qualities: [
      { name: "Coordinacion", emphasis: "primary" },
      { name: "Equilibrio", emphasis: "secondary" },
    ],
    muscles: [
      { name: "Gluteos", group: "Cadera", emphasis: "primary" },
      { name: "Aductores", group: "Cadera", emphasis: "primary" },
    ],
    equipment: [{ name: "Peso corporal" }],
    sportTransfer: {
      sport: "Padel",
      description:
        "Mecanica de desplazamiento lateral usada directamente para cubrir la pista — de todo el programa, el ejercicio mas cercano al gesto competitivo real.",
      descriptionEn:
        "Lateral-movement mechanics used directly to cover the court — of the whole program, the exercise closest to the real competitive action.",
      evidenceRating: "strong",
    },
  },
  {
    // FULL — links to the tall-kneeling regression above
    name: "Lanzamiento Rotacional Lateral Medicine Ball",
    nameEn: "Lateral Rotational Medicine Ball Throw",
    aliases: ["lanzamiento rotacional lateral medball"],
    objective:
      "Desarrollar potencia rotacional a traves de la cadena cadera-tronco-hombro — el patron de separacion y secuenciacion que subyace a la potencia de golpeo.",
    objectiveEn:
      "Develop rotational power through the hip-trunk-shoulder chain — the separation and sequencing pattern underlying hitting power.",
    movementComplexity:
      "Moderada — el timing de la rotacion de cadera y la soltura de la pelota importan mas que la carga.",
    movementComplexityEn:
      "Moderate — hip-rotation timing and ball release matter more than the load.",
    contraindications:
      "Dolor lumbar agudo; pinzamiento de hombro no resuelto (carga rotacional balistica).",
    contraindicationsEn:
      "Acute low back pain; unresolved shoulder impingement (ballistic rotational load).",
    coachingCues:
      "Carga la cadera trasera antes de lanzar. Separa cadera de hombros — no gires como un bloque. Termina alto, no te desplomes hacia adelante.",
    coachingCuesEn:
      "Load the back hip before throwing. Separate hip from shoulders — don't rotate as one block. Finish tall, don't collapse forward.",
    evidenceRating: "moderate",
    qualities: [
      { name: "Potencia", emphasis: "primary" },
      { name: "Coordinacion", emphasis: "secondary" },
    ],
    muscles: [
      { name: "Oblicuos", group: "Core", emphasis: "primary" },
      { name: "Gluteos", group: "Cadera", emphasis: "primary" },
      { name: "Dorsal ancho", group: "Espalda", emphasis: "secondary" },
    ],
    equipment: [{ name: "Balon medicinal" }],
    sportTransfer: {
      sport: "Padel",
      description:
        "Entrena directamente la separacion cadera-hombro y la secuenciacion rotacional que subyace al remate y a la vibora.",
      descriptionEn:
        "Directly trains the hip-shoulder separation and rotational sequencing underlying the smash and the vibora.",
      evidenceRating: "moderate",
    },
  },
];

// (fromName, toName, relationship, rationale)
const EXERCISE_LINKS: Array<{
  from: string;
  to: string;
  type: "progression" | "regression" | "variation" | "alternative";
  rationale: string;
  rationaleEn?: string;
}> = [
  {
    from: "Lanzamiento Rotacional Lateral Medicine Ball",
    to: "Lanzamiento Lateral Medicine Ball en Tall Kneeling",
    type: "regression",
    rationale:
      "El tall kneeling elimina el impulso de piernas y la rotacion de cadera, aislando la rotacion de tronco — una entrada mas simple al mismo patron de lanzamiento.",
    rationaleEn:
      "Tall kneeling removes leg drive and hip rotation, isolating trunk rotation — a simpler entry point into the same throwing pattern.",
  },
];

async function seedExercises() {
  const exerciseIdByName = new Map<string, string>();

  for (const seed of EXERCISES) {
    const translated = {
      nameEn: seed.nameEn,
      objectiveEn: seed.objectiveEn,
      movementComplexityEn: seed.movementComplexityEn,
      contraindicationsEn: seed.contraindicationsEn,
      coachingCuesEn: seed.coachingCuesEn,
    };
    const exercise = await prisma.exercise.upsert({
      where: { name: seed.name },
      // Only the *_En fields are updated on rerun -- the Spanish fields
      // below stay create-only, matching this file's existing convention
      // of never overwriting already-seeded Spanish content by accident.
      update: translated,
      create: {
        name: seed.name,
        aliases: seed.aliases ?? [],
        objective: seed.objective,
        movementComplexity: seed.movementComplexity,
        contraindications: seed.contraindications,
        coachingCues: seed.coachingCues,
        evidenceRating: seed.evidenceRating,
        ...translated,
      },
    });
    exerciseIdByName.set(seed.name, exercise.id);

    for (const q of seed.qualities ?? []) {
      const quality = await upsertQuality(q.name);
      await prisma.exercisePhysicalQuality.upsert({
        where: { exerciseId_qualityId: { exerciseId: exercise.id, qualityId: quality.id } },
        update: { emphasis: q.emphasis ?? "primary" },
        create: { exerciseId: exercise.id, qualityId: quality.id, emphasis: q.emphasis ?? "primary" },
      });
    }

    for (const m of seed.muscles ?? []) {
      const muscle = await upsertMuscle(m.name, m.group);
      await prisma.exerciseMuscle.upsert({
        where: { exerciseId_muscleId: { exerciseId: exercise.id, muscleId: muscle.id } },
        update: { emphasis: m.emphasis ?? "primary" },
        create: { exerciseId: exercise.id, muscleId: muscle.id, emphasis: m.emphasis ?? "primary" },
      });
    }

    for (const e of seed.equipment ?? []) {
      const equipment = await upsertEquipment(e.name);
      await prisma.exerciseEquipment.upsert({
        where: { exerciseId_equipmentId: { exerciseId: exercise.id, equipmentId: equipment.id } },
        update: { required: e.required ?? true },
        create: { exerciseId: exercise.id, equipmentId: equipment.id, required: e.required ?? true },
      });
    }

    if (seed.sportTransfer) {
      const sport = await upsertSport(seed.sportTransfer.sport);
      await prisma.sportTransfer.upsert({
        where: { exerciseId_sportId: { exerciseId: exercise.id, sportId: sport.id } },
        update: {
          description: seed.sportTransfer.description,
          descriptionEn: seed.sportTransfer.descriptionEn,
          evidenceRating: seed.sportTransfer.evidenceRating,
        },
        create: {
          exerciseId: exercise.id,
          sportId: sport.id,
          description: seed.sportTransfer.description,
          descriptionEn: seed.sportTransfer.descriptionEn,
          evidenceRating: seed.sportTransfer.evidenceRating,
        },
      });
    }
  }

  for (const link of EXERCISE_LINKS) {
    const fromId = exerciseIdByName.get(link.from);
    const toId = exerciseIdByName.get(link.to);
    if (!fromId || !toId) {
      throw new Error(`ExerciseLink references unknown exercise: ${link.from} -> ${link.to}`);
    }
    await prisma.exerciseLink.upsert({
      where: {
        fromExerciseId_toExerciseId_relationshipType: {
          fromExerciseId: fromId,
          toExerciseId: toId,
          relationshipType: link.type,
        },
      },
      update: { rationale: link.rationale, rationaleEn: link.rationaleEn },
      create: {
        fromExerciseId: fromId,
        toExerciseId: toId,
        relationshipType: link.type,
        rationale: link.rationale,
        rationaleEn: link.rationaleEn,
      },
    });
  }

  return exerciseIdByName;
}

interface BlockExerciseSeed {
  exercise: string;
  prescriptionType: "reps" | "reps_per_side" | "distance" | "time";
  repsOrDuration: string;
  repsOrDurationEn?: string;
  sets?: number;
  instanceNote?: string;
  instanceNoteEn?: string;
}
interface BlockSeed {
  order: number;
  blockType: "straight" | "superset" | "circuit" | "contrast_pair";
  rounds?: number;
  purpose?: string;
  purposeEn?: string;
  exercises: BlockExerciseSeed[];
}
interface SessionSeed {
  label: string;
  labelEn?: string;
  order: number;
  role: "warmup" | "main" | "recovery";
  blocks: BlockSeed[];
}

const PROGRAM_SESSIONS: SessionSeed[] = [
  {
    label: "Mov Prep",
    labelEn: "Mov Prep",
    order: 0,
    role: "warmup",
    blocks: [], // 3 exercises exist in the app; not yet seen in a screenshot
  },
  {
    label: "Dia 1",
    labelEn: "Day 1",
    order: 1,
    role: "main",
    blocks: [
      // Bloque 1 not seeded — no screenshot seen
      {
        order: 2,
        blockType: "circuit",
        rounds: 4,
        exercises: [
          {
            exercise: "Deadbug + Aduccion + Glute Bridge con Banda de Cadera",
            prescriptionType: "reps_per_side",
            repsOrDuration: "12 y 12",
            repsOrDurationEn: "12 and 12",
          },
        ],
      },
      {
        order: 3,
        blockType: "contrast_pair",
        rounds: 4,
        purpose:
          "Fuerza unilateral (landmine split squat) emparejada con un gesto balistico de cadera (kettlebell swing) — contraste fuerza-potencia. Inferido de la pareja de ejercicios, a confirmar contigo.",
        purposeEn:
          "Unilateral strength (landmine split squat) paired with a ballistic hip movement (kettlebell swing) — strength/power contrast. Inferred from the exercise pairing, to be confirmed with you.",
        exercises: [
          {
            exercise: "Landmine Drop Split Squat",
            prescriptionType: "reps_per_side",
            repsOrDuration: "6 y 6",
            repsOrDurationEn: "6 and 6",
          },
          { exercise: "Kettlebell Swing", prescriptionType: "reps", repsOrDuration: "15" },
        ],
      },
      {
        order: 4,
        blockType: "straight",
        rounds: 4,
        exercises: [
          {
            exercise: "Landmine Halfmoon Press",
            prescriptionType: "reps_per_side",
            repsOrDuration: "6 y 6",
            repsOrDurationEn: "6 and 6",
          },
        ],
      },
    ],
  },
  {
    label: "Dia 2",
    labelEn: "Day 2",
    order: 2,
    role: "main",
    blocks: [
      // Bloque 1 not seeded — no screenshot seen
      {
        order: 2,
        blockType: "circuit",
        rounds: 4,
        exercises: [
          {
            exercise: "Deadbug to Lateral Plank con KTB",
            prescriptionType: "reps_per_side",
            repsOrDuration: "10 y 10",
            repsOrDurationEn: "10 and 10",
          },
        ],
      },
      {
        order: 3,
        blockType: "straight",
        rounds: 4,
        exercises: [
          {
            exercise: "Hang Staggered Muscle Snatch",
            prescriptionType: "reps_per_side",
            repsOrDuration: "3 y 3",
            repsOrDurationEn: "3 and 3",
          },
        ],
      },
      {
        order: 4,
        blockType: "straight",
        rounds: 3,
        exercises: [
          {
            exercise: "DB Front Rack Step Up",
            prescriptionType: "reps_per_side",
            repsOrDuration: "12 y 12",
            repsOrDurationEn: "12 and 12",
          },
          {
            exercise: "Lanzamiento Lateral Medicine Ball en Tall Kneeling",
            prescriptionType: "reps_per_side",
            repsOrDuration: "8 y 8",
            repsOrDurationEn: "8 and 8",
          },
        ],
      },
    ],
  },
  {
    label: "Dia 3",
    labelEn: "Day 3",
    order: 3,
    role: "main",
    blocks: [
      {
        order: 1,
        blockType: "straight",
        rounds: 4,
        exercises: [
          {
            exercise: "Monopodal Rack Pull",
            prescriptionType: "reps",
            repsOrDuration: "6",
            instanceNote: "Ejercicio unilateral prescrito como '6' (no '6 y 6') en el original — confirmar si es por lado.",
            instanceNoteEn:
              "Unilateral exercise prescribed as '6' (not '6 and 6') in the original — confirm whether it's per side.",
          },
        ],
      },
      {
        order: 2,
        blockType: "contrast_pair",
        rounds: 4,
        purpose:
          "Transporte cargado (fuerza/estabilidad de baja velocidad) emparejado con un salto pliometrico reactivo (alta velocidad) — contraste de velocidad de ejecucion.",
        purposeEn:
          "Loaded carry (low-velocity strength/stability) paired with a reactive plyometric jump (high velocity) — execution-speed contrast.",
        exercises: [
          {
            exercise: "Farmer's Walk Posterior",
            prescriptionType: "distance",
            repsOrDuration: "25 pasos por lado",
            repsOrDurationEn: "25 steps per side",
          },
          {
            exercise: "Drop Staggered Squat to Jump Staggered Squat",
            prescriptionType: "reps_per_side",
            repsOrDuration: "10 y 10",
            repsOrDurationEn: "10 and 10",
          },
        ],
      },
      {
        order: 3,
        blockType: "straight",
        rounds: 4,
        exercises: [
          { exercise: "Drop Horizontal Switch Jump", prescriptionType: "reps", repsOrDuration: "8" },
          {
            exercise: "DB Overhead Isometric-Concentric Shoulder Press",
            prescriptionType: "reps_per_side",
            repsOrDuration: "8 y 8",
            repsOrDurationEn: "8 and 8",
          },
        ],
      },
      {
        order: 4,
        blockType: "straight",
        rounds: 4,
        exercises: [
          { exercise: "Double Landmine Press", prescriptionType: "reps", repsOrDuration: "7" },
        ],
      },
    ],
  },
  {
    label: "Dia 4",
    labelEn: "Day 4",
    order: 4,
    role: "main",
    blocks: [
      // Bloque 1 not seeded — no screenshot seen
      {
        order: 2,
        blockType: "straight",
        rounds: 4,
        purpose:
          "Ambos ejercicios son patrones de pie de padel entrenados como bloque de potencia/coordinacion, no fuerza de gimnasio generica.",
        purposeEn:
          "Both exercises are padel-specific footwork patterns trained as a power/coordination block, not generic gym strength.",
        exercises: [
          {
            exercise: "Hip Turn + Drop Step",
            prescriptionType: "reps_per_side",
            repsOrDuration: "8 y 8",
            repsOrDurationEn: "8 and 8",
          },
          {
            exercise: "Lanzamiento Rotacional Lateral Medicine Ball",
            prescriptionType: "reps_per_side",
            repsOrDuration: "8 y 8",
            repsOrDurationEn: "8 and 8",
          },
        ],
      },
      {
        order: 3,
        blockType: "straight",
        rounds: 4,
        exercises: [
          {
            exercise: "Hip Turn + Shuffle",
            prescriptionType: "reps_per_side",
            repsOrDuration: "8 y 8",
            repsOrDurationEn: "8 and 8",
          },
          {
            exercise: "Landmine Halfmoon Press",
            prescriptionType: "reps_per_side",
            repsOrDuration: "6 y 6",
            repsOrDurationEn: "6 and 6",
          },
        ],
      },
    ],
  },
];

async function seedProgram(exerciseIdByName: Map<string, string>) {
  const padel = await upsertSport("Padel");

  const program = await prisma.program.upsert({
    where: { id: "seed-julio-y-el-resto" },
    update: { nameEn: "Julio and the rest" },
    create: {
      id: "seed-julio-y-el-resto",
      name: "julio y el resto",
      nameEn: "Julio and the rest",
      startDate: new Date("2026-07-20"),
      endDate: new Date("2026-07-31"),
      sportId: padel.id,
    },
  });

  for (const sessionSeed of PROGRAM_SESSIONS) {
    const session = await prisma.session.upsert({
      where: { programId_order: { programId: program.id, order: sessionSeed.order } },
      update: { label: sessionSeed.label, labelEn: sessionSeed.labelEn, role: sessionSeed.role },
      create: {
        programId: program.id,
        label: sessionSeed.label,
        labelEn: sessionSeed.labelEn,
        order: sessionSeed.order,
        role: sessionSeed.role,
      },
    });

    for (const blockSeed of sessionSeed.blocks) {
      const block = await prisma.block.upsert({
        where: { sessionId_order: { sessionId: session.id, order: blockSeed.order } },
        update: {
          blockType: blockSeed.blockType,
          rounds: blockSeed.rounds,
          purpose: blockSeed.purpose,
          purposeEn: blockSeed.purposeEn,
        },
        create: {
          sessionId: session.id,
          order: blockSeed.order,
          blockType: blockSeed.blockType,
          rounds: blockSeed.rounds,
          purpose: blockSeed.purpose,
          purposeEn: blockSeed.purposeEn,
        },
      });

      for (const [index, be] of blockSeed.exercises.entries()) {
        const exerciseId = exerciseIdByName.get(be.exercise);
        if (!exerciseId) {
          throw new Error(`Block references unknown exercise: ${be.exercise}`);
        }
        const order = index + 1;
        await prisma.blockExercise.upsert({
          where: { blockId_order: { blockId: block.id, order } },
          update: {
            exerciseId,
            prescriptionType: be.prescriptionType,
            repsOrDuration: be.repsOrDuration,
            repsOrDurationEn: be.repsOrDurationEn,
            sets: be.sets,
            instanceNote: be.instanceNote,
            instanceNoteEn: be.instanceNoteEn,
          },
          create: {
            blockId: block.id,
            order,
            exerciseId,
            prescriptionType: be.prescriptionType,
            repsOrDuration: be.repsOrDuration,
            repsOrDurationEn: be.repsOrDurationEn,
            sets: be.sets,
            instanceNote: be.instanceNote,
            instanceNoteEn: be.instanceNoteEn,
          },
        });
      }
    }
  }
}

async function main() {
  console.log("Seeding exercises...");
  const exerciseIdByName = await seedExercises();
  console.log(`Seeded ${exerciseIdByName.size} exercises.`);

  console.log("Seeding program...");
  await seedProgram(exerciseIdByName);
  console.log("Done.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
