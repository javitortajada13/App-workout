// UI chrome text (buttons, labels, empty/error states) for the two
// languages the app currently supports. This is deliberately separate
// from the *content* translations (exercise names, contraindications,
// coaching cues, etc.) -- that content lives in the database and is
// resolved server-side per apps/api/src/mappers.ts `pick()`, since it's
// real coaching knowledge that needs a careful, reviewed translation, not
// UI copy. See PROJECT_STATE.md, language-support entry.
//
// `en` is typed against `es`'s shape (`satisfies Strings`), so a missing
// key is a compile error rather than a silently-blank label.

export type Lang = "es" | "en";

const es = {
  tabs: { home: "Inicio", coach: "Coach", programs: "Programas", profile: "Perfil" },
  stack: { program: "Programa", session: "Sesion", exercise: "Ejercicio" },
  login: {
    title: "Iniciar sesion",
    subtitle: "Introduce el email y la contrasena que te ha dado tu entrenador.",
    emailPlaceholder: "Email",
    passwordPlaceholder: "Contrasena",
    submit: "Entrar",
  },
  home: {
    greeting: "Hola",
    subtitle: "Tu coach de preparacion fisica para padel",
    connectionError: "No se pudo conectar con el servidor",
    currentProgram: "Programa actual",
    sessionsCount: "sesiones",
    noProgram: "Todavia no hay programas asignados.",
    askCoach: "Preguntale al coach",
  },
  programs: {
    title: "Programas",
    connectionError: "No se pudo conectar con el servidor",
    noPrograms: "Todavia no hay programas.",
    sessionsCount: "sesiones",
  },
  program: {
    loadError: "No se pudo cargar el programa",
    noBlocks: "Sin bloques todavia",
    blocks: "bloques",
    exercises: "ejercicios",
    role: { warmup: "Calentamiento", main: "Principal", recovery: "Recuperacion" },
  },
  session: {
    loadError: "No se pudo cargar la sesion",
    noBlocks: "Todavia no hay bloques cargados para esta sesion.",
    block: "Bloque",
    times: "veces",
  },
  exercise: {
    loadError: "No se pudo cargar el ejercicio",
    noVideo: "No carga el video? Abrelo aqui",
    watchVideo: "Ver video",
    howTo: "Como hacerlo",
    equipment: "Equipamiento",
    optional: "opcional",
    why: "Por que",
    trains: "Que entrena",
    secondary: "secundaria",
    muscles: "Musculos",
    contraindications: "Contraindicaciones",
    evidence: "Evidencia cientifica",
    sportTransfer: "Transferencia al deporte",
    variations: "Variaciones",
    link: {
      progression: "Progresion",
      regression: "Regresion (mas facil)",
      variation: "Variacion",
      alternative: "Alternativa",
    },
  },
  coach: {
    emptyTitle: "Preguntale al coach",
    emptyExamples:
      '"Por que hago este ejercicio?" · "Me duele el hombro" · "Solo tengo bandas" · "Hazme hoy mas facil el entreno"',
    placeholder: "Escribe tu pregunta...",
    send: "Enviar",
    error: "No se pudo contactar con el coach. Intentalo de nuevo.",
  },
  profile: {
    title: "Perfil",
    subtitle: "Nivel de atleta y preferencias llegan en una fase posterior.",
    language: "Idioma",
    spanish: "Espanol",
    english: "English",
    signOut: "Cerrar sesion",
  },
  prescription: { reps: "reps", perSide: "(por lado)" },
  evidence: {
    strong: "Evidencia solida",
    moderate: "Evidencia moderada",
    limited: "Evidencia limitada",
    conflicting: "Evidencia conflictiva",
    insufficient: "Evidencia insuficiente",
  },
};

export type Strings = typeof es;

const en = {
  tabs: { home: "Home", coach: "Coach", programs: "Programs", profile: "Profile" },
  stack: { program: "Program", session: "Session", exercise: "Exercise" },
  login: {
    title: "Log in",
    subtitle: "Enter the email and password your coach gave you.",
    emailPlaceholder: "Email",
    passwordPlaceholder: "Password",
    submit: "Log in",
  },
  home: {
    greeting: "Hi",
    subtitle: "Your padel strength & conditioning coach",
    connectionError: "Couldn't connect to the server",
    currentProgram: "Current program",
    sessionsCount: "sessions",
    noProgram: "No program assigned yet.",
    askCoach: "Ask the coach",
  },
  programs: {
    title: "Programs",
    connectionError: "Couldn't connect to the server",
    noPrograms: "No programs yet.",
    sessionsCount: "sessions",
  },
  program: {
    loadError: "Couldn't load the program",
    noBlocks: "No blocks yet",
    blocks: "blocks",
    exercises: "exercises",
    role: { warmup: "Warm-up", main: "Main", recovery: "Recovery" },
  },
  session: {
    loadError: "Couldn't load the session",
    noBlocks: "No blocks loaded for this session yet.",
    block: "Block",
    times: "rounds",
  },
  exercise: {
    loadError: "Couldn't load the exercise",
    noVideo: "Video not loading? Open it here",
    watchVideo: "Watch video",
    howTo: "How to do it",
    equipment: "Equipment",
    optional: "optional",
    why: "Why",
    trains: "What it trains",
    secondary: "secondary",
    muscles: "Muscles",
    contraindications: "Contraindications",
    evidence: "Scientific evidence",
    sportTransfer: "Sport transfer",
    variations: "Variations",
    link: {
      progression: "Progression",
      regression: "Regression (easier)",
      variation: "Variation",
      alternative: "Alternative",
    },
  },
  coach: {
    emptyTitle: "Ask the coach",
    emptyExamples:
      '"Why am I doing this exercise?" · "My shoulder hurts" · "I only have bands" · "Make today\'s workout easier"',
    placeholder: "Type your question...",
    send: "Send",
    error: "Couldn't reach the coach. Try again.",
  },
  profile: {
    title: "Profile",
    subtitle: "Athlete level and preferences are coming in a later phase.",
    language: "Language",
    spanish: "Espanol",
    english: "English",
    signOut: "Sign out",
  },
  prescription: { reps: "reps", perSide: "(per side)" },
  evidence: {
    strong: "Strong evidence",
    moderate: "Moderate evidence",
    limited: "Limited evidence",
    conflicting: "Conflicting evidence",
    insufficient: "Insufficient evidence",
  },
} satisfies Strings;

export const STRINGS: Record<Lang, Strings> = { es, en };
