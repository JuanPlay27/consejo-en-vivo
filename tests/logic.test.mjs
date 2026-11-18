// Ejecutar con: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { FLOW, PHASES, QUESTIONS, QUESTION_BY_ID, SLIDES, phaseOfStep } from "../js/content.js";
import {
  correctLabel, correctValue, formatClock, generateName, isValidAnswer, percent, pointsFor,
  randomValue, ranking, remainingMs, scoreAnswer, tally,
} from "../js/logic.js";

const byId = QUESTION_BY_ID;

test("el contenido es consistente", () => {
  const ids = QUESTIONS.map((q) => q.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const q of QUESTIONS) {
    assert.ok(PHASES[q.phase], `${q.id}: fase inexistente`);
    assert.ok(q.prompt && q.mechanic && q.time >= 10, q.id);
    assert.ok(isValidAnswer(q, correctValue(q)), `${q.id}: la respuesta correcta no es válida`);
    assert.equal(scoreAnswer(q, correctValue(q)).correct, true, `${q.id}: la correcta no puntúa`);
    assert.ok(correctLabel(q).length > 0, q.id);
  }
});

test("el recorrido: intro; por tema, diapositiva incompleta → pregunta → la misma completa; podio y conclusiones", () => {
  assert.deepEqual(FLOW[0], { slide: "intro" });
  assert.deepEqual(FLOW.at(-1), { slide: "conclusiones" });
  assert.ok(FLOW.at(-2).podium);
  for (const [i, item] of FLOW.entries()) {
    if (item.slide) assert.ok(SLIDES[item.slide], `diapositiva inexistente: ${item.slide}`);
    if (item.question) {
      assert.ok(QUESTION_BY_ID[item.question], `pregunta inexistente: ${item.question}`);
      const before = FLOW[i - 1];
      const after = FLOW[i + 1];
      assert.ok(before?.slide && before.partial, `${item.question} debe ir precedida de la diapositiva incompleta`);
      assert.ok(after?.slide && !after.partial, `${item.question} debe ir seguida de la diapositiva completa`);
      assert.equal(before.slide, after.slide, `${item.question}: la introducción y la explicación son de diapositivas distintas`);
      assert.equal(phaseOfStep(i).name, phaseOfStep(i + 1).name, `${item.question}: la diapositiva es de otra fase`);
      assert.ok(SLIDES[before.slide].cue, `${before.slide}: falta la invitación a responder (cue)`);
    }
  }
  const asked = FLOW.filter((i) => i.question).map((i) => i.question);
  assert.deepEqual(asked.sort(), QUESTIONS.map((q) => q.id).sort(), "cada pregunta aparece una vez");
});

test("componentes se explica en dos diapositivas y la IA empareja normas con descripciones", () => {
  assert.equal(new Set(FLOW.filter((i) => i.slide && SLIDES[i.slide].phase === "comp").map((i) => i.slide)).size, 2);
  const ia = QUESTION_BY_ID.ia;
  assert.equal(ia.style, "match");
  assert.ok(ia.columns.every((c) => c.length > 20), "las columnas son descripciones");
});

test("opción única: solo la correcta da puntos", () => {
  const q = byId.resultados;
  assert.equal(pointsFor(q, 0, 1000), 1000);
  assert.equal(pointsFor(q, 2, 1000), 0);
  assert.equal(isValidAnswer(q, 7), false);
  assert.equal(isValidAnswer(q, "0"), false);
});

test("ordenar: importa Evaluar → Dirigir → Monitorear; Involucrar puede ir donde sea", () => {
  const q = byId.modelo; // items: Monitorear(0) Involucrar(1) Evaluar(2) Dirigir(3)
  assert.equal(scoreAnswer(q, [2, 3, 0, 1]).correct, true);
  assert.equal(scoreAnswer(q, [1, 2, 3, 0]).correct, true);
  assert.equal(scoreAnswer(q, [2, 1, 3, 0]).correct, true);
  assert.equal(scoreAnswer(q, [3, 2, 0, 1]).correct, false);
  assert.equal(isValidAnswer(q, [2, 2, 0, 1]), false);
});

test("número: exacto vale todo y los valores parciales valen su fracción", () => {
  const q = { type: "number", min: 1, max: 20, answer: 11, partial: { 6: 0.5 } };
  assert.equal(pointsFor(q, 11, 1000), 1000);
  assert.equal(pointsFor(q, 6, 1000), 500);
  assert.equal(pointsFor(q, 12, 1000), 0);
  assert.equal(isValidAnswer(q, 21), false);
});

test("faltan 2: exige elegir exactamente 2 y da puntos parciales", () => {
  const q = byId.marco;
  assert.equal(scoreAnswer(q, [3, 1]).correct, true);
  assert.equal(pointsFor(q, [1, 0], 1000), 500);
  assert.equal(isValidAnswer(q, [1]), false);
  assert.equal(isValidAnswer(q, [1, 1]), false);
});

test("clasificar y emparejar: puntos proporcionales a filas correctas", () => {
  const q = byId.beneficios;
  assert.equal(scoreAnswer(q, [0, 1, 2, 0, 1]).correct, true);
  assert.equal(pointsFor(q, [0, 1, 0, 0, 1], 1000), 800);
  assert.equal(isValidAnswer(q, [0, 1, 2]), false);
  assert.equal(scoreAnswer(byId.ia, [1, 0, 2]).correct, true);
  assert.equal(pointsFor(byId.ia, [1, 2, 0], 1000), 333);
});

test("tally cuenta por tipo de pregunta", () => {
  const single = tally(byId.resultados, { a: { v: 0 }, b: { v: 0 }, c: { v: 2 }, d: { v: 99 } });
  assert.deepEqual(single.counts, [2, 0, 1]);
  assert.equal(single.answered, 3);
  assert.equal(single.correct, 2);

  const order = tally(byId.modelo, { a: { v: [2, 3, 0, 1] }, b: { v: [0, 1, 2, 3] } });
  assert.deepEqual(order.firstCounts, [1, 0, 1, 0]);
  assert.equal(order.correct, 1);

  const num = tally({ type: "number", min: 1, max: 20, answer: 11 }, { a: { v: 11 }, b: { v: 6 }, c: { v: 11 } });
  assert.deepEqual(num.histogram, { 11: 2, 6: 1 });

  const grid = tally(byId.ia, { a: { v: [1, 0, 2] }, b: { v: [1, 2, 0] } });
  assert.deepEqual(grid.rowCorrect, [2, 1, 1]);
  assert.deepEqual(grid.cells[0], [0, 2, 0]);
});

test("las respuestas al azar de los bots siempre son válidas", () => {
  for (const q of QUESTIONS) {
    for (let i = 0; i < 50; i += 1) assert.ok(isValidAnswer(q, randomValue(q)), q.id);
  }
});

test("nombres anónimos: concuerdan en género y no se repiten", () => {
  const taken = new Set();
  for (let i = 0; i < 40; i += 1) {
    const { name, emoji } = generateName(Math.random, taken);
    assert.ok(!taken.has(name) && emoji, name);
    taken.add(name);
  }
  const seq = [0.1, 0.0]; // Tortuga (índice 2) necesita adjetivo femenino
  const rnd = (() => { let k = 0; return () => [2 / 24 + 0.001, 7 / 16 + 0.001, ...seq][k++ % 4]; })();
  assert.equal(generateName(rnd).name, "Tortuga Sabia");
});

test("ranking, porcentajes y reloj", () => {
  const r = ranking({ a: { name: "B", score: 500 }, b: { name: "A", score: 900 }, c: { score: 10 } });
  assert.deepEqual(r.map((p) => p.name), ["A", "B"]);
  assert.equal(percent(1, 3), 33);
  assert.equal(percent(0, 0), 0);
  assert.equal(formatClock(20_000), "20");
  assert.equal(formatClock(75_000), "1:15");
  assert.equal(remainingMs({ startedAt: 0, durationSec: 20 }, 5000), 15_000);
});
