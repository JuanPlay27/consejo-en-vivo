// Contenido de "Consejo en vivo": preguntas, diapositivas de la infografía y el orden en que se muestran.
// Todo sale del informe del Grupo 2. Para cambiar textos, edite solo este archivo.
//
// Tipos de pregunta (type):
//   single → una opción. style: "choice" | "truefalse" | "bars" | "fill"
//   order  → ordenar burbujas. sequence = índices que deben quedar en ese orden relativo;
//            free = índices que pueden ir en cualquier posición.
//   number → adivinar un número entre min y max. partial = { valor: fracción de puntos }.
//   multi  → elegir exactamente answer.length opciones.
//   grid   → una columna por fila. style: "classify" | "match".
// En los textos de las diapositivas, **así** se escribe en negrita.
// Cada tema se muestra en tres tiempos: diapositiva INCOMPLETA (introducción, oculta lo que se
// va a preguntar) → PREGUNTA → la misma diapositiva COMPLETA (para terminar la explicación).
// `cue` es la invitación a responder que aparece en la versión incompleta.

export const PHASES = {
  key: { num: "★", name: "Idea clave", color: "#ffd23f" },
  def: { num: "1", name: "¿Qué es?", color: "#ff5d8f" },
  comp: { num: "2", name: "Componentes", color: "#36e2d0" },
  ben: { num: "3", name: "Beneficios y límites", color: "#ffd23f" },
  ia: { num: "5", name: "¿Y la IA?", color: "#a78bfa" },
  fin: { num: "6", name: "Conclusiones", color: "#4ade80" },
};

export const QUESTIONS = [
  {
    id: "resultados", phase: "def", type: "single", style: "choice", time: 20,
    mechanic: "Opción única",
    prompt: "La norma busca 3 resultados, heredados de la ISO 37000. ¿Cuáles son?",
    options: [
      "Desempeño eficaz · Administración responsable · Comportamiento ético",
      "Reducción de costos · Seguridad de la información · Certificación internacional",
      "Eficiencia operativa · Cumplimiento legal · Innovación tecnológica",
    ],
    answer: 0,
  },
  {
    id: "modelo", phase: "comp", type: "order", time: 25,
    mechanic: "Ordena las burbujas",
    prompt: "Modelo: ¿en qué orden hace el consejo estas tareas?",
    items: ["Monitorear", "Involucrar", "Evaluar", "Dirigir"],
    sequence: [2, 3, 0],
    free: [1],
    freeTag: "Nuevo 2024",
  },
  {
    id: "marco", phase: "comp", type: "multi", time: 25,
    mechanic: "Completa los que faltan",
    prompt: "Marco: tiene 6 elementos y aquí ves 4. ¿Cuáles 2 faltan?",
    given: ["Dirección", "Capacidad", "Política", "Delegación"],
    options: ["Supervisión", "Desempeño", "Certificación", "Rendición de cuentas", "Innovación", "Auditoría externa"],
    answer: [1, 3],
  },
  {
    id: "beneficios", phase: "ben", type: "grid", style: "classify", time: 30,
    mechanic: "Clasifica",
    prompt: "¿Beneficio, límite… o falso?",
    rows: [
      "Sirve para cualquier organización, sin importar su tamaño",
      "No dice cómo implementarla paso a paso",
      "Reemplaza a COBIT 2019 y a la ISO/IEC 27001",
      "Separa con claridad el gobierno de la gestión",
      "El texto completo es de pago (CHF 155)",
    ],
    columns: ["Beneficio", "Límite", "Falso"],
    answer: [0, 1, 2, 0, 1],
  },
  {
    id: "ia", phase: "ia", type: "grid", style: "match", time: 30,
    mechanic: "Empareja",
    prompt: "IA: une cada norma con su descripción.",
    rows: ["ISO/IEC 42001", "ISO/IEC 38500 + 38507", "Reglamento (UE) 2024/1689"],
    columns: [
      "El consejo habilita y supervisa la IA: datos, riesgo y ética",
      "Sistema de gestión de la IA en el día a día (PHVA)",
      "Ley de IA obligatoria en la Unión Europea",
    ],
    answer: [1, 0, 2],
  },
];

// Diapositivas: versión grande de cada casilla de la infografía, para explicar al frente.
export const SLIDES = {
  intro: {
    phase: "key", kind: "intro", phoneText: "Empezamos: mira la pantalla.",
    tags: ["GRUPO 2 · GESTIÓN DE TIC · UFPS", "Gobierno de TI e IA"],
    subtitle: "Gobierno de TI para la organización · Edición 2024 (3.ª) · ISO/IEC JTC 1/SC 40",
    quote: "Las decisiones sobre TI no son solo del área técnica:",
    highlight: "las toma la alta dirección.",
  },
  "que-es": {
    phase: "def", kind: "que-es", title: "¿Qué es?", phoneText: "Explicación: ¿Qué es la ISO/IEC 38500?",
    text: "Una **guía de principios** para que el órgano de gobierno (consejo, junta, socios) use las TI de forma **eficaz, eficiente y aceptable**.",
    label: "Busca 3 resultados · ISO 37000",
    cue: "¿Cuáles son esos 3 resultados? Respondan en su celular",
    results: [
      { name: "Desempeño eficaz", icon: "target", color: "#ff5d8f", tint: "#ffe4ee", desc: "Coherente con su propósito: cumple lo esperado y genera valor." },
      { name: "Administración responsable", icon: "leaf", color: "#36e2d0", tint: "#d5f9f4", desc: "Uso responsable de los recursos; aporta al desarrollo sostenible." },
      { name: "Comportamiento ético", icon: "scale", color: "#ffd23f", tint: "#fff3bf", desc: "Cultura ética, rendición de cuentas y transparencia." },
    ],
  },
  modelo: {
    phase: "comp", kind: "modelo", title: "Componentes", tag: "Modelo y principios", phoneText: "Explicación: el modelo y los 11 principios.",
    modelLabel: "Modelo: lo que hace el consejo",
    cue: "4 tareas del consejo: ¿en qué orden? Respondan en su celular",
    model: [
      { name: "Evaluar", color: "#ff5d8f", desc: "la situación, las obligaciones y las expectativas" },
      { name: "Dirigir", color: "#36e2d0", desc: "con estrategias y políticas" },
      { name: "Monitorear", color: "#ffd23f", desc: "el desempeño y la conformidad" },
      { name: "Involucrar", color: "#ffedd5", desc: "a las partes interesadas", badge: "Nuevo 2024" },
    ],
    principlesLabel: "Principios · 11 (antes 6)",
    principles: [
      { count: 1, label: "primario", color: "#ff5d8f", names: ["Propósito"] },
      { count: 4, label: "fundamentales", color: "#36e2d0", names: ["Generación de valor", "Estrategia", "Supervisión", "Rendición de cuentas"] },
      { count: 6, label: "habilitantes", color: "#a78bfa", names: ["Participación de las partes interesadas", "Liderazgo", "Datos y decisiones", "Gobernanza del riesgo", "Responsabilidad social", "Viabilidad y desempeño a lo largo del tiempo"] },
    ],
    note: "En 2015 eran 6: responsabilidad, estrategia, adquisición, desempeño, conformidad y comportamiento humano.",
  },
  marco: {
    phase: "comp", kind: "marco", title: "Componentes", tag: "Marco y familia", phoneText: "Explicación: los 6 elementos del marco.",
    frameLabel: "Marco · 6 elementos: donde gobierno y gestión operan juntos",
    cue: "Faltan 2 elementos: ¿cuáles son? Respondan en su celular",
    frame: [
      { name: "Dirección", desc: "Orientar el uso de las TI según los objetivos." },
      { name: "Capacidad", desc: "Identificar y coordinar las capacidades digitales clave." },
      { name: "Política", desc: "Reglas que guían el uso de las TI, con flexibilidad." },
      { name: "Delegación", desc: "Repartir autoridad y responsabilidad, con supervisión." },
      { name: "Desempeño", desc: "Fijar expectativas y monitorearlas.", missing: true },
      { name: "Rendición de cuentas", desc: "Demostrar que se cumplen las políticas de TI.", missing: true },
    ],
    familyLabel: "Familia de normas",
    family: ["38501", "38502", "38503 · evalúa el gobierno de TI", "38507 · gobierno de la IA"],
  },
  beneficios: {
    phase: "ben", kind: "beneficios", title: "Beneficios y límites", phoneText: "Explicación: beneficios y límites.",
    cue: "¿Beneficio, límite… o falso? Respondan en su celular",
    // hide: se oculta en la versión incompleta porque es lo que se pregunta.
    pros: [
      { text: "Para cualquier organización", hide: true },
      { text: "Separa gobierno y gestión", hide: true },
      { text: "Más transparencia al decidir" },
    ],
    cons: [
      { text: "No dice cómo implementarla", hide: true },
      { text: "Barreras: liderazgo y personal" },
      { text: "Es de pago (CHF 155)", hide: true },
    ],
    note: "Y lo falso: **no reemplaza** a COBIT, ISO 27001 ni NIST CSF. **Los complementa.**",
  },
  ia: {
    phase: "ia", kind: "ia", title: "¿Y la IA? Gobernar ≠ gestionar", phoneText: "Explicación: la ISO/IEC 38500 y la IA.",
    cue: "¿Qué norma va con cada papel? Respondan en su celular",
    blocks: [
      { label: "Gobierna", icon: "shield", code: "38500 + 38507", text: "El consejo habilita y supervisa la IA: datos, riesgo y ética.", color: "#8b5cf6", tint: "#ede9fe", ink: "#5b21b6" },
      { label: "Gestiona", icon: "gear", code: "42001", text: "Sistema de gestión de la IA en el día a día (PHVA).", color: "#38bdf8", tint: "#e0f2fe", ink: "#0369a1" },
      // introText: lo que se muestra en la introducción, sin delatar qué norma es.
      { label: "Obliga", icon: "landmark", code: "UE 2024/1689", text: "Reglamento de IA: obligatorio en la UE. Las ISO son voluntarias.", introText: "Es ley: obligatoria en la Unión Europea. Las ISO son voluntarias.", color: "#f59e0b", tint: "#fff3bf", ink: "#92400e", dashed: true },
    ],
  },
  conclusiones: {
    phase: "fin", kind: "conclusiones", title: "Meta: conclusiones", phoneText: "Conclusiones: mira la pantalla.",
    text: "La norma dice **qué** decide el consejo; COBIT, ISO 27001 o NIST CSF aportan el **cómo**.",
    label: "Recomendaciones",
    items: ["Indica la edición (2015 o 2024)", "Evalúa con la ISO/IEC 38503", "Para IA: 38507 + 42001"],
    next: "Y ahora… ¡el video! 🎬",
  },
};

// El orden de la presentación: introducción (incompleta) → pregunta → explicación (completa).
export const FLOW = [
  { slide: "intro" },
  { slide: "que-es", partial: true },
  { question: "resultados" },
  { slide: "que-es" },
  { slide: "modelo", partial: true },
  { question: "modelo" },
  { slide: "modelo" },
  { slide: "marco", partial: true },
  { question: "marco" },
  { slide: "marco" },
  { slide: "beneficios", partial: true },
  { question: "beneficios" },
  { slide: "beneficios" },
  { slide: "ia", partial: true },
  { question: "ia" },
  { slide: "ia" },
  { podium: true },
  { slide: "conclusiones" },
];

export const QUESTION_BY_ID = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));

/** Fase (color y número de la infografía) de un paso del recorrido. */
export function phaseOfStep(step) {
  const item = FLOW[step];
  if (!item) return PHASES.key;
  if (item.question) return PHASES[QUESTION_BY_ID[item.question].phase];
  if (item.slide) return PHASES[SLIDES[item.slide].phase];
  return PHASES.fin;
}
