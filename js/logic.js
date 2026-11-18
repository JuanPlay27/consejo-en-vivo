// Reglas puras del cuestionario (sin red ni DOM): validar, puntuar y contar respuestas.
// Se prueban con `npm test`.

// ------------------------------------------------------------------ validación
export function isValidAnswer(q, v) {
  switch (q.type) {
    case "single":
      return Number.isInteger(v) && v >= 0 && v < q.options.length;
    case "number":
      return Number.isInteger(v) && v >= q.min && v <= q.max;
    case "order":
      return isPermutation(v, q.items.length);
    case "multi":
      return Array.isArray(v) && v.length === q.answer.length && new Set(v).size === v.length
        && v.every((i) => Number.isInteger(i) && i >= 0 && i < q.options.length);
    case "grid":
      return Array.isArray(v) && v.length === q.rows.length
        && v.every((c) => Number.isInteger(c) && c >= 0 && c < q.columns.length);
    default:
      return false;
  }
}

function isPermutation(v, n) {
  return Array.isArray(v) && v.length === n && new Set(v).size === n && v.every((i) => Number.isInteger(i) && i >= 0 && i < n);
}

// ------------------------------------------------------------------ puntuación
/** fraction: 0 a 1 de los puntos; correct: respuesta totalmente correcta. */
export function scoreAnswer(q, v) {
  if (!isValidAnswer(q, v)) return { fraction: 0, correct: false };
  switch (q.type) {
    case "single":
      return full(v === q.answer);
    case "number":
      if (v === q.answer) return full(true);
      return { fraction: q.partial?.[v] ?? 0, correct: false };
    case "order": {
      // Solo importa el orden relativo de `sequence`; los índices de `free` pueden ir donde sea.
      const positions = q.sequence.map((item) => v.indexOf(item));
      return full(positions.every((p, i) => i === 0 || p > positions[i - 1]));
    }
    case "multi": {
      const hits = v.filter((i) => q.answer.includes(i)).length;
      return { fraction: hits / q.answer.length, correct: hits === q.answer.length };
    }
    case "grid": {
      const hits = v.filter((c, row) => c === q.answer[row]).length;
      return { fraction: hits / q.rows.length, correct: hits === q.rows.length };
    }
    default:
      return full(false);
  }
}

const full = (ok) => ({ fraction: ok ? 1 : 0, correct: ok });

export function pointsFor(q, v, pointsCorrect) {
  return Math.round(scoreAnswer(q, v).fraction * pointsCorrect);
}

// ------------------------------------------------------------------ conteos para la pantalla
export function tally(q, answers) {
  const values = Object.values(answers || {}).map((a) => a?.v).filter((v) => isValidAnswer(q, v));
  const base = { answered: values.length, correct: values.filter((v) => scoreAnswer(q, v).correct).length };
  switch (q.type) {
    case "single":
      return { ...base, counts: countBy(values, q.options.length, (v) => [v]) };
    case "multi":
      return { ...base, counts: countBy(values, q.options.length, (v) => v) };
    case "order":
      return { ...base, firstCounts: countBy(values, q.items.length, (v) => [v[0]]) };
    case "number": {
      const histogram = {};
      for (const v of values) histogram[v] = (histogram[v] || 0) + 1;
      return { ...base, histogram };
    }
    case "grid":
      return {
        ...base,
        rowCorrect: q.rows.map((_, row) => values.filter((v) => v[row] === q.answer[row]).length),
        cells: q.rows.map((_, row) => countBy(values, q.columns.length, (v) => [v[row]])),
      };
    default:
      return base;
  }
}

function countBy(values, size, pick) {
  const counts = Array(size).fill(0);
  for (const v of values) for (const i of pick(v)) counts[i] += 1;
  return counts;
}

// ------------------------------------------------------------------ respuestas de referencia
export function correctValue(q) {
  switch (q.type) {
    case "order": return [...q.sequence, ...q.free];
    default: return structuredClone(q.answer);
  }
}

/** Una respuesta válida al azar (la usan los bots de ensayo). */
export function randomValue(q, random = Math.random) {
  const pick = (n) => Math.floor(random() * n);
  switch (q.type) {
    case "single": return pick(q.options.length);
    case "number": return q.min + pick(q.max - q.min + 1);
    case "order": return shuffle(q.items.map((_, i) => i), random);
    case "multi": return shuffle(q.options.map((_, i) => i), random).slice(0, q.answer.length);
    case "grid": return q.rows.map(() => pick(q.columns.length));
    default: return null;
  }
}

/** Texto corto con la respuesta correcta, para el celular. */
export function correctLabel(q) {
  switch (q.type) {
    case "single": return q.options[q.answer];
    case "number": return String(q.answer);
    case "order": return `${q.sequence.map((i) => q.items[i]).join(" → ")} (+ ${q.free.map((i) => q.items[i]).join(", ")})`;
    case "multi": return q.answer.map((i) => q.options[i]).join(" y ");
    case "grid": return q.rows.map((row, i) => `${row}: ${q.columns[q.answer[i]]}`).join("\n");
    default: return "";
  }
}

// ------------------------------------------------------------------ jugadores
const ANIMALS = [
  ["Búho", "m", "🦉"], ["Zorro", "m", "🦊"], ["Tortuga", "f", "🐢"], ["Jaguar", "m", "🐆"],
  ["Cóndor", "m", "🦅"], ["Colibrí", "m", "🐦"], ["Nutria", "f", "🦦"], ["Ballena", "f", "🐋"],
  ["Lince", "m", "🐈"], ["Panda", "m", "🐼"], ["Mapache", "m", "🦝"], ["Tucán", "m", "🦜"],
  ["Ardilla", "f", "🐿️"], ["Llama", "f", "🦙"], ["Delfín", "m", "🐬"], ["Pingüino", "m", "🐧"],
  ["Iguana", "f", "🦎"], ["Abeja", "f", "🐝"], ["Koala", "m", "🐨"], ["Pulpo", "m", "🐙"],
  ["Mariposa", "f", "🦋"], ["Rana", "f", "🐸"], ["León", "m", "🦁"], ["Jirafa", "f", "🦒"],
];
const ADJECTIVES = [
  ["Ético", "Ética"], ["Estratega", "Estratega"], ["Transparente", "Transparente"], ["Visionario", "Visionaria"],
  ["Responsable", "Responsable"], ["Prudente", "Prudente"], ["Curioso", "Curiosa"], ["Sabio", "Sabia"],
  ["Valiente", "Valiente"], ["Auditor", "Auditora"], ["Ágil", "Ágil"], ["Digital", "Digital"],
  ["Supervisor", "Supervisora"], ["Innovador", "Innovadora"], ["Leal", "Leal"], ["Brillante", "Brillante"],
];

/** Nombre anónimo al azar ("Búho Ético", "Tortuga Sabia"), sin repetir los ya usados. */
export function generateName(random = Math.random, taken = new Set()) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const [animal, gender, emoji] = ANIMALS[Math.floor(random() * ANIMALS.length)];
    const adjective = ADJECTIVES[Math.floor(random() * ADJECTIVES.length)][gender === "m" ? 0 : 1];
    const name = `${animal} ${adjective}`;
    if (!taken.has(name)) return { name, emoji };
  }
  const [animal, , emoji] = ANIMALS[Math.floor(random() * ANIMALS.length)];
  return { name: `${animal} ${Math.floor(random() * 900) + 100}`, emoji };
}

export function ranking(players) {
  return Object.entries(players || {})
    .filter(([, p]) => p && p.name)
    .map(([uid, p]) => ({ uid, name: p.name, emoji: p.emoji || "", score: p.score || 0 }))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}

export function countOnline(players) {
  return Object.values(players || {}).filter((p) => p && p.online).length;
}

// ------------------------------------------------------------------ utilidades
export function remainingMs(state, nowMs) {
  if (!state || state.startedAt == null || !state.durationSec) return 0;
  return Math.max(0, state.startedAt + state.durationSec * 1000 - nowMs);
}

export function formatClock(ms) {
  const totalSec = Math.ceil(Math.max(0, ms) / 1000);
  return totalSec >= 60 ? `${Math.floor(totalSec / 60)}:${String(totalSec % 60).padStart(2, "0")}` : String(totalSec);
}

export function shuffle(items, random = Math.random) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function percent(part, total) {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}
