// Jugadores simulados para ENSAYAR con 20-30 "personas" (no los usen en la clase).
// Corren dentro de la pantalla del anfitrión y responden con las mismas operaciones que un celular.

import { QUESTION_BY_ID } from "./content.js";
import { correctValue, generateName, randomValue } from "./logic.js";

const BOT_ACCURACY = 0.6;
const TICK_MS = 600;
const MIN_DELAY_MS = 1500;
const MAX_DELAY_MS = 11000;

export function createBotSquad(quiz, backend, getSnapshot) {
  const bots = [];
  let timer = null;

  async function tick() {
    const { state, players } = getSnapshot();
    if (state?.phase !== "question") return;
    const q = QUESTION_BY_ID[state.qid];
    const now = backend.serverNow();
    for (const bot of bots) {
      if (bot.round !== state.startedAt) {
        bot.round = state.startedAt;
        bot.answered = false;
        const window = Math.min(MAX_DELAY_MS, q.time * 1000 - 2500);
        bot.dueAt = now + MIN_DELAY_MS + Math.random() * Math.max(0, window - MIN_DELAY_MS);
      }
      if (!bot.answered && now >= bot.dueAt && players?.[bot.uid]) {
        bot.answered = true;
        const value = Math.random() < BOT_ACCURACY ? correctValue(q) : randomValue(q);
        await quiz.submitAnswer(q.id, bot.uid, value);
      }
    }
  }

  return {
    async add(count) {
      const taken = new Set(Object.values(getSnapshot().players || {}).map((p) => p?.name));
      for (let i = 0; i < count; i += 1) {
        const { name, emoji } = generateName(Math.random, taken);
        taken.add(name);
        const uid = `bot-${Math.random().toString(36).slice(2, 9)}`;
        await quiz.joinPlayer(uid, name, emoji, { isBot: true });
        bots.push({ uid, round: null, answered: false, dueAt: 0 });
      }
      timer = timer || setInterval(tick, TICK_MS);
    },
    stop() {
      clearInterval(timer);
      timer = null;
      bots.length = 0;
    },
  };
}
