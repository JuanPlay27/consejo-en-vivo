// Pantalla del proyector. Recorre FLOW: por cada tema, diapositiva incompleta → pregunta →
// diapositiva completa; al final, podio y conclusiones.
// Cada paso entra deslizándose desde la derecha. Con ?clave=<HOST_KEY> también es el
// anfitrión: avanza, revela, retrocede y reinicia. Los puntos los reparte solo el anfitrión.

import { FLOW, PHASES, QUESTIONS, QUESTION_BY_ID, SLIDES, phaseOfStep } from "./content.js";
import { HOST_KEY, LIVE_COUNTS } from "./config.js";
import { createBackend } from "./backend.js";
import { createQuiz } from "./game.js";
import { createBotSquad } from "./bots.js";
import { countOnline, formatClock, percent, ranking, remainingMs, tally } from "./logic.js";
import { buildPanel, promptNode } from "./panels.js";
import { buildSlide } from "./slides.js";
import { confetti, createSounds, el, novaSvg, show } from "./ui.js";
import qrcode from "./vendor/qrcode.mjs";

const RING = 2 * Math.PI * 52;
const URGENT_SEC = 5;
const AUTO_REVEAL_DELAY_MS = 900;
const RESET_CONFIRM_MS = 3000;
const LEAVE_MS = 900;

const isHost = new URLSearchParams(location.search).get("clave") === HOST_KEY;
const $ = (id) => document.getElementById(id);
const sounds = createSounds();

const snap = { state: null, players: {}, answers: {}, results: {} };
const lobbyNameEls = new Map();
let backend;
let quiz;
let bots;
let scene = null;
let lastStep = null;
let answersFor = null;
let stopAnswers = () => {};
let liveCounts = LIVE_COUNTS;
let forceQr = false;
let revealedKey = null;
let resetArmedAt = 0;

init().catch(showFatal);

async function init() {
  backend = await createBackend();
  quiz = createQuiz(backend);
  bots = createBotSquad(quiz, backend, () => snap);

  renderQr();
  show($("modePill"), backend.mode === "demo");
  if (isHost) setupHost();

  backend.listen(quiz.path("state"), (v) => { snap.state = v; onState(); });
  backend.listen(quiz.path("players"), (v) => { snap.players = v || {}; onPlayers(); });
  backend.listen(quiz.path("results"), (v) => { snap.results = v || {}; scene?.update(); });
  backend.onConnection((connected) => show($("connPill"), !connected));
  setInterval(() => scene?.tick?.(), 200);
}

const phase = () => snap.state?.phase || "lobby";
const step = () => snap.state?.step ?? null;
const currentQuestion = () => QUESTION_BY_ID[snap.state?.qid] || null;
const isQuestionPhase = () => phase() === "question" || phase() === "reveal";

// ------------------------------------------------------------------ cambios de estado
function onState() {
  show($("lobby"), phase() === "lobby" || forceQr);
  if (isHost) $("host").classList.toggle("collapsed", phase() !== "lobby");
  updateHeader();

  if (phase() === "lobby") {
    $("viewport").replaceChildren();
    scene = null;
    lastStep = null;
  } else {
    const key = `${step()}:${snap.state.startedAt ?? ""}`;
    if (!scene || scene.key !== key) {
      const direction = lastStep === null || step() >= lastStep ? 1 : -1;
      mount(buildScene(key), direction);
      lastStep = step();
    } else {
      scene.sync?.();
    }
  }
  // Primero se arma la escena y después se escuchan sus respuestas, para no pintar
  // respuestas de una pregunta sobre el panel de otra.
  watchAnswers(isQuestionPhase() ? snap.state.qid : null);
}

function watchAnswers(questionId) {
  if (questionId === answersFor) return;
  stopAnswers();
  answersFor = questionId;
  snap.answers = {};
  stopAnswers = questionId
    ? backend.listen(quiz.path(`answers/${questionId}`), (v) => { snap.answers = v || {}; scene?.update(); })
    : () => {};
}

function onPlayers() {
  const online = countOnline(snap.players);
  $("playersPill").textContent = `${online} conectados`;
  $("lobbyCount").textContent = String(online);
  renderLobbyNames();
  scene?.update();
}

function updateHeader() {
  if (phase() === "lobby") return setHeader(PHASES.key, "Consejo en vivo", "ISO/IEC 38500 · Grupo 2 · UFPS", `${QUESTIONS.length} preguntas`);
  const item = FLOW[step()];
  const ph = phaseOfStep(step());
  if (item.question) {
    const q = QUESTION_BY_ID[item.question];
    return setHeader(ph, ph.name, q.mechanic, `Pregunta ${QUESTIONS.indexOf(q) + 1} de ${QUESTIONS.length}`);
  }
  if (item.podium) return setHeader(PHASES.fin, "Podio", "¡Gracias por jugar!", "Podio");
  const slide = SLIDES[item.slide];
  const moment = item.slide === "intro" ? "Inicio" : item.slide === "conclusiones" ? "Cierre" : item.partial ? "Introducción" : "Explicación";
  const sub = [slide.tag, item.slide === "intro" ? "Antes de empezar" : moment].filter(Boolean).join(" · ");
  return setHeader(ph, ph.name, sub, moment);
}

function setHeader(ph, name, sub, pill) {
  $("phaseToken").textContent = ph.num;
  $("phaseToken").style.setProperty("--phase", ph.color);
  $("phaseName").firstChild.textContent = name;
  $("phaseSub").textContent = sub;
  $("qPill").textContent = pill;
}

// ------------------------------------------------------------------ escenas y transición
function buildScene(key) {
  const item = FLOW[step()];
  const built = item.question ? questionScene(QUESTION_BY_ID[item.question])
    : item.podium ? podiumScene()
      : slideScene(SLIDES[item.slide], Boolean(item.partial));
  return { update() {}, ...built, key };
}

/** La escena nueva entra por un lado mientras la anterior sale por el otro. */
function mount(next, direction) {
  const viewport = $("viewport");
  const previous = scene;
  next.node.classList.add("scene", direction > 0 ? "from-right" : "from-left");
  viewport.append(next.node);
  scene = next;
  next.sync?.();
  next.update();
  void next.node.offsetWidth;
  requestAnimationFrame(() => next.node.classList.remove("from-right", "from-left"));
  if (previous) {
    previous.node.classList.add(direction > 0 ? "to-left" : "to-right");
    setTimeout(() => previous.node.remove(), LEAVE_MS);
  }
}

function slideScene(slide, partial) {
  return { kind: "slide", node: buildSlide(slide, { partial }) };
}

function questionScene(q) {
  const timerFg = svgCircle();
  const timer = el("div", { className: "q-timer" });
  timer.innerHTML = '<svg viewBox="0 0 120 120" aria-hidden="true"><circle class="bg" cx="60" cy="60" r="52"></circle></svg>';
  timer.firstChild.append(timerFg);
  const timerNum = el("b", { text: "–" });
  timer.append(timerNum);
  const ansNum = el("b", { text: "0" });
  const ansText = el("span", { text: "respondieron" });
  const ansBar = el("i");
  const say = el("div", { className: "q-say", text: "¿Qué elegirías?" });
  const nova = el("div", { className: "q-nova" });
  nova.innerHTML = novaSvg("happy", "bob");
  const main = el("section", { className: "q-main" });
  const node = el("div", { className: "q-stage" }, [
    main,
    el("aside", { className: "q-rail" }, [timer, el("div", { className: "q-answered" }, [ansNum, ansText, el("div", { className: "q-meter" }, [ansBar])]), say, nova]),
  ]);
  let mode = null;
  let panel = null;
  let autoReveal = null;
  let lastSecond = null;

  return {
    kind: "question",
    node,
    sync() {
      const next = phase() === "reveal" ? "reveal" : "question";
      if (next === mode) return;
      mode = next;
      clearTimeout(autoReveal);
      autoReveal = null;
      panel = buildPanel(q, mode);
      main.replaceChildren(...[promptNode(q, mode === "reveal"), panel.node, mode === "reveal" ? nextHint() : null].filter(Boolean));
      if (mode === "reveal") sounds.reveal();
      this.update();
    },
    update() {
      if (!panel || snap.state?.qid !== q.id) return;
      const t = tally(q, snap.answers);
      const online = countOnline(snap.players);
      const total = Math.max(online, t.answered);
      ansNum.textContent = String(t.answered);
      ansText.textContent = `de ${total} respondieron`;
      ansBar.style.width = `${percent(t.answered, total)}%`;
      panel.update(t, { live: liveCounts });
      if (mode === "reveal") {
        const pct = percent(t.correct, t.answered);
        say.textContent = t.answered ? `¡${pct} % acertó!` : "Nadie respondió";
        nova.innerHTML = novaSvg(pct >= 50 ? "happy" : "worried", "bob");
        return;
      }
      // Si ya respondieron todos los conectados, no hace falta esperar al reloj.
      if (isHost && online > 0 && t.answered >= online && !autoReveal) {
        autoReveal = setTimeout(doReveal, AUTO_REVEAL_DELAY_MS);
      }
    },
    tick() {
      if (mode !== "question") {
        timerNum.textContent = "0";
        timerFg.style.strokeDashoffset = String(RING);
        timer.classList.remove("hot");
        return;
      }
      const left = remainingMs(snap.state, backend.serverNow());
      const seconds = Math.ceil(left / 1000);
      timerNum.textContent = formatClock(left);
      timerFg.style.strokeDashoffset = String(RING * (1 - left / (snap.state.durationSec * 1000)));
      timer.classList.toggle("hot", seconds <= URGENT_SEC);
      if (seconds !== lastSecond && seconds <= URGENT_SEC && seconds > 0) sounds.tick();
      lastSecond = seconds;
      if (isHost && left === 0) doReveal();
    },
  };
}

function svgCircle() {
  const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  for (const [k, v] of Object.entries({ class: "fg", cx: 60, cy: 60, r: 52 })) circle.setAttribute(k, String(v));
  circle.style.strokeDasharray = String(RING);
  return circle;
}

function nextHint() {
  return el("p", { className: "q-nexthint" }, [
    document.createTextNode("A continuación: la explicación en la infografía"),
    isHost ? el("b", { text: "Espacio ▶" }) : null,
  ]);
}

function podiumScene() {
  const node = el("section", { className: "q-podium-scene" });
  let shownKey = null;
  return {
    kind: "podium",
    node,
    update() {
      const top = ranking(snap.players).filter((p) => p.score > 0);
      const key = top.map((p) => `${p.uid}:${p.score}`).join();
      if (key === shownKey) return;
      const firstTime = shownKey === null;
      shownKey = key;
      const results = Object.values(snap.results);
      const answered = results.reduce((n, r) => n + (r.answered || 0), 0);
      const correct = results.reduce((n, r) => n + (r.correct || 0), 0);
      const steps = [[top[1], 2, "22vh", "#36e2d0"], [top[0], 1, "30vh", "#ffd23f"], [top[2], 3, "16vh", "#ff9f1c"]]
        .filter(([p]) => p)
        .map(([p, place, height, color]) => el("div", { className: "q-step" }, [
          el("div", { className: "who" }, [el("small", { text: `${p.score} pts` }), document.createTextNode(`${p.emoji} ${p.name}`)]),
          el("div", { className: "block", text: String(place), style: { height, background: color } }),
        ]));
      node.replaceChildren(
        el("h2", { className: "q-podium-title", text: "¡Podio del Consejo!" }),
        el("div", { className: "q-podium" }, steps),
        el("div", { className: "q-rest" }, top.slice(3, 15).map((p, i) => el("span", { text: `${i + 4}. ${p.emoji} ${p.name} · ${p.score}` }))),
        el("p", { className: "q-hint", text: `El consejo acertó el ${percent(correct, answered)} % de las respuestas` }),
        el("div", { className: "q-next", text: "Ahora: las conclusiones ▶" }),
      );
      if (firstTime) { confetti(160); sounds.win(); }
    },
  };
}

async function doReveal() {
  if (phase() !== "question") return;
  const key = `${step()}:${snap.state.startedAt}`;
  if (revealedKey === key) return;
  revealedKey = key;
  await quiz.reveal(step(), snap.answers, snap.players);
}

// ------------------------------------------------------------------ sala de espera
function renderQr() {
  const url = new URL("./", location.href);
  if (new URLSearchParams(location.search).has("demo")) url.search = "?demo";
  const qr = qrcode(0, "M");
  qr.addData(url.href);
  qr.make();
  $("qr").innerHTML = qr.createSvgTag({ cellSize: 8, margin: 2, scalable: true, alt: "Código QR para unirse" });
  $("joinUrl").textContent = `${url.host}${url.pathname}${url.search}`;
}

function renderLobbyNames() {
  const online = Object.entries(snap.players).filter(([, p]) => p?.online && p.name);
  const ids = new Set(online.map(([uid]) => uid));
  for (const [uid, node] of lobbyNameEls) if (!ids.has(uid)) { node.remove(); lobbyNameEls.delete(uid); }
  for (const [uid, p] of online) {
    if (lobbyNameEls.has(uid)) continue;
    const chip = el("span", { text: `${p.emoji || ""} ${p.name}`.trim() });
    $("lobbyNames").append(chip);
    lobbyNameEls.set(uid, chip);
  }
}

// ------------------------------------------------------------------ anfitrión
function setupHost() {
  show($("host"), true);
  const actions = {
    h: () => $("host").classList.toggle("collapsed"),
    e: () => {
      if (phase() !== "lobby") return toast("Para empezar de nuevo, primero Reiniciar (R R)");
      sounds.unlock();
      forceQr = false;
      return quiz.startQuiz(snap.players);
    },
    " ": () => {
      sounds.unlock();
      if (phase() === "lobby") return actions.e();
      if (phase() === "question") return doReveal();
      if (step() >= FLOW.length - 1) return toast("Fin del recorrido. Ahora, ¡el video!");
      return quiz.next(step());
    },
    arrowleft: () => {
      if (phase() === "lobby" || step() === 0) return undefined;
      if (phase() === "question") return toast("Primero revela la pregunta (Espacio)");
      return quiz.previous(step());
    },
    q: () => { forceQr = !forceQr; onState(); },
    d: () => { liveCounts = !liveCounts; toast(liveCounts ? "Conteo en vivo: visible" : "Conteo en vivo: oculto hasta revelar"); scene?.update(); },
    r: () => {
      if (Date.now() - resetArmedAt > RESET_CONFIRM_MS) { resetArmedAt = Date.now(); return toast("Pulsa Reiniciar otra vez para confirmar"); }
      resetArmedAt = 0;
      return quiz.resetQuiz(snap.players);
    },
    b: async () => { await bots.add(5); toast("5 bots de ensayo conectados (quítalos antes de la clase)"); },
    x: async () => { bots.stop(); await quiz.removeBots(snap.players); toast("Bots eliminados"); },
    m: () => toast(sounds.toggle() ? "Sonido apagado" : "Sonido encendido"),
    f: () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.()),
  };
  const buttons = { hToggle: "h", hStart: "e", hPrev: "arrowleft", hNext: " ", hQr: "q", hLive: "d", hReset: "r", hBots: "b", hNoBots: "x", hMute: "m", hFull: "f" };
  for (const [id, key] of Object.entries(buttons)) $(id).onclick = (e) => { e.currentTarget.blur(); run(actions[key]); };
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const key = e.key === "Enter" || e.key === "ArrowRight" ? " " : e.key.toLowerCase();
    if (actions[key]) { e.preventDefault(); run(actions[key]); }
  });
}

async function run(action) {
  try { await action(); } catch (err) { toast(`Error: ${err.message}`); }
}

let toastTimer;
function toast(message) {
  const node = $("toast");
  node.textContent = message;
  node.classList.add("on");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.remove("on"), 2600);
}

function showFatal(err) {
  document.body.classList.remove("screen");
  document.body.replaceChildren(el("div", { className: "fatal" }, [
    el("h2", { text: "No se pudo conectar" }),
    el("p", { text: err.message }),
    el("p", { text: "Revisen js/config.js, las reglas de Firebase y la sección «Si algo falla» del README. Para ensayar sin Firebase, agreguen ?demo a la dirección." }),
  ]));
}
