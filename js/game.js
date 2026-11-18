// Operaciones del cuestionario sobre la base de datos.
// El anfitrión avanza por FLOW (introducción, pregunta, explicación… y podio). El estado guarda en qué paso va.
// Las respuestas se guardan con transacción: la primera queda y no se puede cambiar.
// Los puntos los calcula SOLO el anfitrión al revelar, y el paso a "revelado" también es
// una transacción: aunque haya dos pantallas abiertas, nadie recibe puntos dos veces.

import { FLOW, QUESTION_BY_ID } from "./content.js";
import { DB_ROOT, POINTS_CORRECT } from "./config.js";
import { isValidAnswer, pointsFor, scoreAnswer } from "./logic.js";

export function createQuiz(backend, root = DB_ROOT) {
  const path = (sub) => `${root}/${sub}`;

  /** Estado de un paso. Volver atrás a una pregunta la muestra ya revelada (sin repetirla). */
  function stateForStep(step, { revisit = false } = {}) {
    const item = FLOW[step];
    if (item.slide) return { phase: "slide", step, slide: item.slide, partial: Boolean(item.partial) };
    if (item.podium) return { phase: "podium", step, endedAt: backend.serverNow() };
    const q = QUESTION_BY_ID[item.question];
    if (revisit) return { phase: "reveal", step, qid: q.id, startedAt: 0, durationSec: q.time };
    return { phase: "question", step, qid: q.id, startedAt: backend.serverNow(), durationSec: q.time };
  }

  return {
    path,

    async joinPlayer(uid, name, emoji, { isBot = false } = {}) {
      await backend.update(path(`players/${uid}`), { name, emoji, online: true, bot: isBot, seenAt: backend.serverNow() });
      await backend.onDisconnectSet(path(`players/${uid}/online`), false);
    },

    /** Devuelve true si la respuesta quedó guardada (false si ya había respondido). */
    async submitAnswer(qid, uid, value) {
      const q = QUESTION_BY_ID[qid];
      if (!q || !isValidAnswer(q, value)) return false;
      const result = await backend.transaction(path(`answers/${q.id}/${uid}`), (current) =>
        (current ? undefined : { v: value, at: backend.serverNow() }));
      return result.committed;
    },

    // ------------------------------------------------ acciones del anfitrión
    startQuiz(players) {
      return backend.update(root, {
        ...clearScores(players),
        answers: null,
        results: null,
        state: stateForStep(0),
      });
    },

    /** Cierra la pregunta y reparte los puntos. Devuelve false si otra pantalla ya lo hizo. */
    async reveal(step, answers, players) {
      const moved = await backend.transaction(path("state"), (current) => {
        if (!current || current.phase !== "question" || current.step !== step) return undefined;
        return { ...current, phase: "reveal", revealedAt: backend.serverNow() };
      });
      if (!moved.committed) return false;

      const q = QUESTION_BY_ID[moved.value.qid];
      const updates = {};
      let correct = 0;
      for (const [uid, answer] of Object.entries(answers || {})) {
        if (scoreAnswer(q, answer?.v).correct) correct += 1;
        const points = pointsFor(q, answer?.v, POINTS_CORRECT);
        if (points > 0) updates[`players/${uid}/score`] = (players?.[uid]?.score || 0) + points;
      }
      updates[`results/${q.id}`] = { answered: Object.keys(answers || {}).length, correct };
      await backend.update(root, updates);
      return true;
    },

    next(step) {
      return step + 1 < FLOW.length ? backend.set(path("state"), stateForStep(step + 1)) : Promise.resolve();
    },

    previous(step) {
      return step > 0 ? backend.set(path("state"), stateForStep(step - 1, { revisit: true })) : Promise.resolve();
    },

    resetQuiz(players) {
      // Firebase no acepta en el mismo update una ruta y su hija: los desconectados se
      // borran enteros y a los conectados solo se les limpia el puntaje.
      const entries = Object.entries(players || {});
      const offline = entries.filter(([, p]) => !p?.online).map(([uid]) => [`players/${uid}`, null]);
      const online = Object.fromEntries(entries.filter(([, p]) => p?.online));
      return backend.update(root, {
        ...clearScores(online),
        ...Object.fromEntries(offline),
        answers: null,
        results: null,
        state: { phase: "lobby" },
      });
    },

    removeBots(players) {
      const bots = Object.entries(players || {}).filter(([, p]) => p?.bot).map(([uid]) => [`players/${uid}`, null]);
      return bots.length ? backend.update(root, Object.fromEntries(bots)) : Promise.resolve();
    },
  };
}

function clearScores(players) {
  return Object.fromEntries(Object.keys(players || {}).map((uid) => [`players/${uid}/score`, null]));
}
