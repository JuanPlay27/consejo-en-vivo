// Vista del celular: nombre anónimo, una interfaz por mecánica y el resultado de cada pregunta.
// Todo se deriva de la base de datos, así que recargar la página no pierde nada.

import { FLOW, PHASES, QUESTIONS, QUESTION_BY_ID, SLIDES } from "./content.js";
import { POINTS_CORRECT } from "./config.js";
import { createBackend, wantsDemo } from "./backend.js";
import { createQuiz } from "./game.js";
import { correctLabel, countOnline, formatClock, generateName, pointsFor, ranking, remainingMs, scoreAnswer } from "./logic.js";
import { confetti, el, novaSvg, vibrate } from "./ui.js";

const OPTION_COLORS = ["#ff5d8f", "#36e2d0", "#ffd23f", "#a78bfa", "#ff9f1c", "#4ade80"];
const GRID_COLORS = { classify: ["#4ade80", "#ff9f1c", "#ff5d8f"], match: ["#a78bfa", "#36e2d0", "#ffd23f"] };
const LETTERS = "ABCDEF";
const URGENT_SEC = 5;
const KEYS = { uid: "quiz-uid", name: "quiz-name", emoji: "quiz-emoji" };
const PODIUM_STEP = FLOW.findIndex((item) => item.podium);

// En modo ensayo cada pestaña es un jugador distinto; en vivo, el celular recuerda quién es.
const store = wantsDemo() ? sessionStorage : localStorage;
const $ = (id) => document.getElementById(id);

const uid = loadUid();
const me = { name: store.getItem(KEYS.name) || "", emoji: store.getItem(KEYS.emoji) || "" };
const snap = { state: null, players: {}, answers: {} };
let backend;
let quiz;
let connected = true;
let candidate = null;
let viewKey = null;
let refs = {};
let sending = false;
let answersFor = null;
let stopAnswers = () => {};

init().catch((err) => {
  $("view").replaceChildren(card([el("p", { className: "p-text", text: `No se pudo conectar: ${err.message}` })]));
});

function loadUid() {
  let id = store.getItem(KEYS.uid);
  if (!id) {
    const random = globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
    id = `p-${random.replace(/-/g, "").slice(0, 14)}`;
    store.setItem(KEYS.uid, id);
  }
  return id;
}

async function init() {
  $("view").replaceChildren(card([nova("bob"), el("p", { className: "p-text", text: "Conectando con el consejo…" })]));
  backend = await createBackend();
  quiz = createQuiz(backend);
  backend.listen(quiz.path("state"), (v) => { snap.state = v; watchAnswers(); render(); });
  backend.listen(quiz.path("players"), (v) => { snap.players = v || {}; render(); });
  backend.onConnection((isOn) => {
    connected = isOn;
    if (isOn && me.name) quiz.joinPlayer(uid, me.name, me.emoji).catch(() => {});
    render();
  });
  setInterval(render, 300);
}

function watchAnswers() {
  const q = currentQuestion();
  const id = q ? q.id : null;
  if (id === answersFor) return;
  stopAnswers();
  answersFor = id;
  snap.answers = {};
  stopAnswers = id ? backend.listen(quiz.path(`answers/${id}`), (v) => { snap.answers = v || {}; render(); }) : () => {};
}

const phase = () => snap.state?.phase || "lobby";
const currentQuestion = () => (phase() === "question" || phase() === "reveal" ? QUESTION_BY_ID[snap.state?.qid] || null : null);
const myAnswer = () => snap.answers?.[uid]?.v;
const timeLeft = () => (phase() === "question" ? remainingMs(snap.state, backend.serverNow()) : 0);

// ------------------------------------------------------------------ render
function render() {
  if (!backend) return;
  $("top").hidden = !me.name;
  $("meName").textContent = `${me.emoji} ${me.name}`.trim();
  $("meScore").textContent = `${snap.players?.[uid]?.score || 0} pts`;
  $("conn").classList.toggle("off", !connected);
  $("connText").textContent = connected ? "En línea" : "Reconectando…";

  const key = viewKeyNow();
  if (key !== viewKey) {
    viewKey = key;
    refs = {};
    $("view").replaceChildren(...buildView(key.split(":")[0]));
  }
  updateLive();
}

function viewKeyNow() {
  if (!me.name) return "join";
  const s = snap.state;
  if (phase() === "lobby") return "lobby";
  if (phase() === "podium" || (phase() === "slide" && s.step > PODIUM_STEP)) return "podium";
  if (phase() === "slide") return `slide:${s.step}`;
  const base = `${s.step}:${s.startedAt}`;
  if (phase() === "reveal") return `reveal:${base}:${myAnswer() === undefined ? 0 : 1}`;
  if (myAnswer() !== undefined) return `sent:${base}`;
  return timeLeft() > 0 ? `ask:${base}` : `late:${base}`;
}

function buildView(kind) {
  switch (kind) {
    case "join": return joinView();
    case "lobby": return lobbyView();
    case "ask": return [questionHeader(), ...askView(currentQuestion())];
    case "sent": return [questionHeader(), waitView("🔒 ¡Respuesta enviada!", "Esperando a los demás…", true)];
    case "late": return [questionHeader(), waitView("⏱ ¡Se acabó el tiempo!", "Mira la pantalla: ya viene la respuesta.", false)];
    case "reveal": return revealView(currentQuestion());
    case "podium": return podiumView();
    case "slide": return slideView(SLIDES[snap.state.slide], snap.state.partial);
    default: return [];
  }
}

function updateLive() {
  if (refs.count) {
    const answered = Object.keys(snap.answers || {}).length;
    const online = countOnline(snap.players);
    refs.count.textContent = viewKey?.startsWith("lobby") ? String(online) : `${answered} de ${Math.max(online, answered)} respondieron`;
  }
  if (refs.clock) {
    const left = timeLeft();
    refs.clock.textContent = formatClock(left);
    refs.clock.classList.toggle("hot", Math.ceil(left / 1000) <= URGENT_SEC);
  }
}

// ------------------------------------------------------------------ vistas
function joinView() {
  const taken = new Set(Object.values(snap.players).map((p) => p?.name));
  candidate = candidate || generateName(Math.random, taken);
  const reroll = button("🎲 Otro nombre", "btn ghost", () => { candidate = generateName(Math.random, taken); viewKey = null; render(); });
  reroll.style.background = "#ede9fe";
  reroll.style.color = "#101040";
  const enter = button("Entrar ▶", "btn pink", async () => {
    me.name = candidate.name;
    me.emoji = candidate.emoji;
    store.setItem(KEYS.name, me.name);
    store.setItem(KEYS.emoji, me.emoji);
    render();
    try { await quiz.joinPlayer(uid, me.name, me.emoji); } catch (err) { toast(`No se pudo entrar: ${err.message}`); }
  });
  return [card([
    nova("bob"),
    el("h1", { className: "p-title", text: "Consejo en vivo" }),
    el("p", { className: "p-text", text: "Entras de forma anónima. Tu nombre secreto será:" }),
    el("div", { className: "p-avatar", text: candidate.emoji }),
    el("div", { className: "p-name", text: candidate.name }),
    el("div", { className: "p-row" }, [reroll, enter]),
  ])];
}

function lobbyView() {
  refs.count = el("div", { className: "p-stat", text: "0" });
  return [card([
    el("div", { className: "p-avatar", text: me.emoji }),
    el("h1", { className: "p-title", text: `¡Listo, ${me.name}!` }),
    el("p", { className: "p-text", text: "Mira la pantalla. Cuando empiece, las preguntas aparecen aquí: piensa, adivina y después lo explicamos." }),
    refs.count,
    el("p", { className: "p-text", text: "consejeros conectados" }),
  ])];
}

function questionHeader() {
  const q = currentQuestion();
  const ph = PHASES[q.phase];
  const token = el("span", { className: "q-token", text: ph.num });
  token.style.setProperty("--phase", ph.color);
  refs.clock = el("span", { className: "clock" });
  return el("div", { className: "p-qhead" }, [
    token,
    el("span", { className: "mech", text: `${QUESTIONS.indexOf(q) + 1}/${QUESTIONS.length} · ${q.mechanic}` }),
    refs.clock,
  ]);
}

function waitView(title, text, withCount) {
  refs.count = withCount ? el("p", { className: "p-text" }) : null;
  return card([nova("bob"), el("h2", { className: "p-title", text: title }), el("p", { className: "p-text", text }), refs.count]);
}

function revealView(q) {
  const value = myAnswer();
  const answered = value !== undefined;
  const result = answered ? scoreAnswer(q, value) : { fraction: 0, correct: false };
  const points = answered ? pointsFor(q, value, POINTS_CORRECT) : 0;
  const tone = result.correct ? "" : result.fraction > 0 ? " partial" : " bad";
  const title = !answered ? "No alcanzaste a responder" : result.correct ? "¡Correcto! 🎉" : result.fraction > 0 ? "¡Casi! 💪" : "¡Uy! No era esa 🙈";
  if (result.correct) { confetti(18); vibrate(80); } else if (answered) vibrate([90, 60, 90]);
  return [card([
    nova(result.correct ? "bob" : "", result.correct ? "happy" : "worried"),
    el("h2", { className: "p-title", text: title }),
    el("div", { className: "p-points", text: `+${points}` }),
    el("div", { className: "p-answer" }, [el("b", { text: "Respuesta correcta" }), document.createTextNode(correctLabel(q))]),
    el("p", { className: "p-text", text: "Mira la pantalla: ahora lo explicamos." }),
  ], `p-result${tone}`)];
}

function slideView(slide, partial) {
  const text = partial
    ? `Introducción: ${slide.title}. Presta atención: ya viene la pregunta.`
    : slide?.phoneText || "Ahora lo explicamos.";
  return [card([
    nova("bob"),
    el("h2", { className: "p-title", text: "📺 Mira la pantalla" }),
    el("p", { className: "p-text", text }),
    el("div", { className: "p-stat", text: String(snap.players?.[uid]?.score || 0) }),
    el("p", { className: "p-text", text: "puntos hasta ahora" }),
  ])];
}

function podiumView() {
  const list = ranking(snap.players);
  const position = list.findIndex((p) => p.uid === uid) + 1;
  if (position > 0 && position <= 3) confetti(60);
  return [card([
    el("div", { className: "p-avatar", text: me.emoji }),
    el("h2", { className: "p-title", text: position > 0 ? `Quedaste #${position} de ${list.length}` : "¡Gracias por jugar!" }),
    el("div", { className: "p-stat", text: `${snap.players?.[uid]?.score || 0}` }),
    el("p", { className: "p-text", text: "puntos. ¡Gracias por gobernar con nosotros! Ahora miren el video en la pantalla." }),
  ])];
}

// ------------------------------------------------------------------ mecánicas
function askView(q) {
  const head = card([
    el("p", { className: "p-prompt", text: q.prompt }),
    el("p", { className: "p-instr", text: instruction(q) }),
  ]);
  head.classList.remove("p-center");
  switch (q.type) {
    case "single": return [head, singleUi(q)];
    case "order": return [head, ...orderUi(q)];
    case "number": return [head, ...numberUi(q)];
    case "multi": return [head, ...multiUi(q)];
    case "grid": return [head, ...gridUi(q)];
    default: return [head];
  }
}

function instruction(q) {
  if (q.type === "single") {
    return {
      truefalse: "¿Mito o realidad? Toca tu respuesta.",
      bars: "Toca el que creas que salió más alto.",
      fill: "Elige las palabras que completan la frase.",
    }[q.style] || "Toca tu respuesta (no se puede cambiar).";
  }
  switch (q.type) {
    case "order": return "Toca las burbujas en orden: 1, 2, 3, 4.";
    case "number": return "Ajusta el número y envía.";
    case "multi": return `Elige las ${q.answer.length} que faltan.`;
    case "grid": return q.style === "match" ? "Elige qué hace cada norma." : "Clasifica cada afirmación.";
    default: return "";
  }
}

function singleUi(q) {
  const big = q.style === "truefalse";
  return el("div", { className: "p-opts" }, q.options.map((text, i) => {
    const btn = el("button", { className: `p-opt${big ? " big" : ""}`, attrs: { type: "button" } }, [
      el("span", { className: "letter", text: LETTERS[i] }), document.createTextNode(text),
    ]);
    btn.style.setProperty("--c", OPTION_COLORS[i]);
    btn.onclick = () => { btn.classList.add("picked"); submit(i); };
    return btn;
  }));
}

function orderUi(q) {
  const sequence = [];
  const preview = el("div", { className: "p-seq" });
  const send = button("Enviar orden ▶", "btn pink p-send", () => submit([...sequence]));
  const buttons = q.items.map((item, i) => {
    const badge = el("span", { className: "p-badge" });
    const btn = el("button", { className: "p-opt", attrs: { type: "button" } }, [el("span", { className: "letter", text: "•" }), document.createTextNode(item), badge]);
    btn.style.setProperty("--c", OPTION_COLORS[i]);
    btn.onclick = () => {
      const at = sequence.indexOf(i);
      if (at >= 0) sequence.splice(at, 1); else sequence.push(i);
      paint();
    };
    return { btn, badge };
  });
  function paint() {
    buttons.forEach(({ badge }, i) => {
      const pos = sequence.indexOf(i);
      badge.textContent = pos >= 0 ? String(pos + 1) : "";
      badge.hidden = pos < 0;
    });
    preview.replaceChildren(...(sequence.length ? sequence.map((i) => el("span", { text: q.items[i] })) : [document.createTextNode("Toca la primera…")]));
    send.disabled = sequence.length !== q.items.length;
  }
  const clear = button("Borrar", "btn ghost", () => { sequence.length = 0; paint(); });
  paint();
  return [preview, el("div", { className: "p-opts" }, buttons.map((b) => b.btn)), el("div", { className: "p-row" }, [clear, send])];
}

function numberUi(q) {
  let value = q.start ?? Math.round((q.min + q.max) / 2);
  const output = el("output", { text: String(value) });
  const range = el("input", { className: "p-range", attrs: { type: "range", min: q.min, max: q.max, step: 1, value, "aria-label": "Número" } });
  const set = (v) => { value = Math.min(q.max, Math.max(q.min, v)); output.textContent = String(value); range.value = String(value); };
  range.oninput = () => set(Number(range.value));
  const minus = button("−", "", () => set(value - 1));
  const plus = button("+", "", () => set(value + 1));
  minus.setAttribute("aria-label", "Menos uno");
  plus.setAttribute("aria-label", "Más uno");
  return [
    card([el("div", { className: "p-number" }, [minus, output, plus]), range]),
    button("Enviar número ▶", "btn pink p-send", () => submit(value)),
  ];
}

function multiUi(q) {
  const need = q.answer.length;
  const chosen = new Set();
  const counter = el("p", { className: "p-instr" });
  const send = button("Enviar ▶", "btn pink p-send", () => submit([...chosen]));
  const given = el("div", { className: "p-given" }, [
    ...q.given.map((g) => el("span", { text: g })),
    ...Array.from({ length: need }, () => el("span", { className: "missing", text: "?" })),
  ]);
  const toggles = q.options.map((text, i) => {
    const btn = el("button", { className: "p-toggle", attrs: { type: "button", "aria-pressed": "false" }, text });
    btn.onclick = () => {
      if (chosen.has(i)) chosen.delete(i);
      else if (chosen.size < need) chosen.add(i);
      else { toast(`Solo puedes elegir ${need}. Quita una primero.`); return; }
      paint();
    };
    return btn;
  });
  function paint() {
    toggles.forEach((btn, i) => { btn.classList.toggle("on", chosen.has(i)); btn.setAttribute("aria-pressed", String(chosen.has(i))); });
    counter.textContent = `Elegidas: ${chosen.size} de ${need}`;
    send.disabled = chosen.size !== need;
  }
  paint();
  return [given, el("div", { className: "p-toggles" }, toggles), counter, send];
}

function gridUi(q) {
  const colors = GRID_COLORS[q.style] || GRID_COLORS.classify;
  const choice = q.rows.map(() => null);
  const send = button("Enviar ▶", "btn pink p-send", () => submit([...choice]));
  const rows = q.rows.map((text, r) => {
    const segs = q.columns.map((col, c) => {
      const b = el("button", { attrs: { type: "button", "aria-pressed": "false" } }, [
        document.createTextNode(col), q.columnHints ? el("small", { text: q.columnHints[c] }) : null,
      ]);
      b.style.setProperty("--c", colors[c]);
      b.onclick = () => { choice[r] = c; paint(); };
      return b;
    });
    return { node: el("div", { className: "p-gridrow" }, [el("p", { text }), el("div", { className: "p-seg" }, segs)]), segs };
  });
  function paint() {
    rows.forEach(({ segs }, r) => segs.forEach((b, c) => { b.classList.toggle("on", choice[r] === c); b.setAttribute("aria-pressed", String(choice[r] === c)); }));
    send.disabled = choice.some((c) => c === null);
  }
  paint();
  return [...rows.map((r) => r.node), send];
}

async function submit(value) {
  if (sending) return;
  if (timeLeft() <= 0) { toast("Se acabó el tiempo"); return; }
  sending = true;
  for (const b of $("view").querySelectorAll("button")) b.disabled = true;
  try {
    const ok = await quiz.submitAnswer(snap.state.qid, uid, value);
    if (ok) vibrate(40);
    else toast("No se guardó: ya habías respondido.");
  } catch (err) {
    toast(`Error de conexión: ${err.message}`);
    viewKey = null;
  } finally {
    sending = false;
    render();
  }
}

// ------------------------------------------------------------------ utilidades
function card(children, extra = "") {
  return el("section", { className: `p-card p-center ${extra}`.trim() }, children);
}

function nova(className = "", mood = "happy") {
  const box = el("div", { className: `p-nova ${className}`.trim() });
  box.innerHTML = novaSvg(mood);
  return box;
}

function button(text, className, onClick) {
  const b = el("button", { className, text, attrs: { type: "button" } });
  b.onclick = onClick;
  return b;
}

let toastTimer;
function toast(message) {
  const node = $("toast");
  node.textContent = message;
  node.classList.add("on");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.remove("on"), 2600);
}
