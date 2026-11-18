// Cómo se dibuja cada mecánica en el PROYECTOR, en dos momentos:
//  - "question": mientras la gente responde (con conteo en vivo opcional).
//  - "reveal": la respuesta correcta y lo que respondió el salón.
// Cada constructor devuelve { node, update(tally, { live }) }.
// La explicación detallada no va aquí: va en la diapositiva que sigue a cada pregunta (slides.js).

import { percent } from "./logic.js";
import { el } from "./ui.js";

const OPTION_COLORS = ["#ff5d8f", "#36e2d0", "#ffd23f", "#a78bfa", "#ff9f1c", "#4ade80"];
const LETTERS = "ABCDEF";
const GRID_COLORS = { classify: ["#4ade80", "#ff9f1c", "#ff5d8f"], match: ["#a78bfa", "#36e2d0", "#ffd23f"] };

export function promptNode(q, reveal) {
  const node = el("div", { className: `q-prompt${reveal ? " compact" : ""}` });
  if (q.style !== "fill") {
    node.textContent = q.prompt;
    return node;
  }
  const words = q.options[q.answer].split(" · ");
  q.prompt.split("___").forEach((part, i, parts) => {
    node.append(document.createTextNode(part));
    if (i < parts.length - 1) {
      node.append(el("span", { className: `q-blank${reveal ? " filled" : ""}`, text: reveal ? words[i] : "?" }));
    }
  });
  return node;
}

export function buildPanel(q, mode) {
  const reveal = mode === "reveal";
  switch (q.type) {
    case "single":
      if (q.style === "bars") return barsPanel(q, reveal);
      return optionsPanel(q, reveal, { big: q.style === "truefalse" });
    case "order": return orderPanel(q, reveal);
    case "number": return numberPanel(q, reveal);
    case "multi": return multiPanel(q, reveal);
    case "grid": return q.style === "match" ? matchPanel(q, reveal) : classifyPanel(q, reveal);
    default: return { node: el("div"), update() {} };
  }
}

// ------------------------------------------------------------------ opción única / mito-realidad / frase
function optionCards(options, { correct = [], reveal, big = false, columns }) {
  const oneColumn = !big && options.some((o) => o.length > 38);
  const wrap = el("div", { className: `q-options${oneColumn ? " one" : ""}` });
  if (columns) wrap.style.gridTemplateColumns = `repeat(${columns}, minmax(0, 1fr))`;
  const refs = options.map((text, i) => {
    const fill = el("span", { className: "fill" });
    const count = el("span", { className: "count" });
    const card = el("div", { className: `q-opt${big ? " big" : ""}` }, [
      fill, el("span", { className: "letter", text: LETTERS[i] }), el("span", { className: "txt", text }), count,
    ]);
    card.style.setProperty("--c", OPTION_COLORS[i % OPTION_COLORS.length]);
    if (reveal) card.classList.add(correct.includes(i) ? "right" : "dim");
    wrap.append(card);
    return { fill, count };
  });
  return {
    node: wrap,
    update(counts, answered, visible) {
      refs.forEach((ref, i) => {
        show(ref.count, visible);
        ref.count.textContent = String(counts[i] || 0);
        ref.fill.style.width = visible ? `${percent(counts[i] || 0, answered)}%` : "0";
      });
    },
  };
}

function optionsPanel(q, reveal, { big }) {
  const cards = optionCards(q.options, { correct: [q.answer], reveal, big });
  return {
    node: el("div", { className: "q-panel" }, [cards.node]),
    update: (t, { live }) => cards.update(t.counts, t.answered, reveal || live),
  };
}

// ------------------------------------------------------------------ barras (predice el dato)
function barsPanel(q, reveal) {
  const refs = q.options.map((label, i) => {
    const fill = el("div", { className: "q-bar-fill" }, reveal ? [el("b", { text: `${q.values[i]} %` })] : []);
    const track = el("div", { className: "q-bar-track" }, [reveal ? null : el("span", { className: "q-q", text: "?" }), fill]);
    const votes = el("div", { className: "q-votes" });
    const bar = el("div", { className: `q-bar${reveal && i === q.answer ? " right" : ""}` }, [
      track, el("div", { className: "q-bar-label", text: label }), votes,
    ]);
    bar.style.setProperty("--c", OPTION_COLORS[i]);
    return { bar, fill, votes };
  });
  if (reveal) requestAnimationFrame(() => requestAnimationFrame(() => refs.forEach((r, i) => { r.fill.style.height = `${q.values[i]}%`; })));
  return {
    node: el("div", { className: "q-panel" }, [el("div", { className: "q-bars" }, refs.map((r) => r.bar))]),
    update(t, { live }) {
      refs.forEach((r, i) => { r.votes.textContent = reveal || live ? `${t.counts[i]} voto${t.counts[i] === 1 ? "" : "s"}` : ""; });
    },
  };
}

// ------------------------------------------------------------------ ordenar burbujas
function orderPanel(q, reveal) {
  const panel = el("div", { className: "q-panel" });
  if (!reveal) {
    const slots = [];
    q.items.forEach((_, i) => {
      if (i > 0) slots.push(el("span", { className: "q-arrow", text: "→" }));
      slots.push(el("div", { className: "q-slot", text: String(i + 1) }));
    });
    const bubbles = q.items.map((item, i) => colored(el("div", { className: "q-bubble", text: item }), i));
    panel.append(el("div", { className: "q-slots" }, slots), el("div", { className: "q-bubbles" }, bubbles),
      el("p", { className: "q-hint", text: "Ordénalas en tu celular" }));
    return { node: panel, update() {} };
  }
  const slots = [];
  q.sequence.forEach((item, i) => {
    if (i > 0) slots.push(el("span", { className: "q-arrow", text: "→" }));
    slots.push(colored(el("div", { className: "q-slot on", text: q.items[item] }), item));
  });
  for (const item of q.free) {
    slots.push(el("span", { className: "q-arrow", text: "+" }));
    const extra = colored(el("div", { className: "q-slot on extra", text: q.items[item] }), item);
    if (q.freeTag) extra.append(el("span", { className: "sticker", text: q.freeTag }));
    slots.push(extra);
  }
  const stats = el("p", { className: "q-hint" });
  panel.append(el("div", { className: "q-slots" }, slots), stats);
  return {
    node: panel,
    update(t) {
      const top = t.firstCounts.indexOf(Math.max(...t.firstCounts));
      stats.textContent = t.answered
        ? `${percent(t.correct, t.answered)} % lo ordenó bien · El primer paso más elegido fue «${q.items[top]}» (${percent(t.firstCounts[top], t.answered)} %)`
        : "Nadie alcanzó a responder";
    },
  };
}

// ------------------------------------------------------------------ adivina el número
function numberPanel(q, reveal) {
  const panel = el("div", { className: "q-panel" });
  if (!reveal) {
    panel.append(el("div", { className: "q-mystery", text: "?" }),
      el("p", { className: "q-hint", text: `Elige un número entre ${q.min} y ${q.max} en tu celular` }));
    return { node: panel, update() {} };
  }
  const cols = [];
  for (let n = q.min; n <= q.max; n += 1) {
    const bar = el("i");
    const label = el("small", { text: String(n) });
    const count = el("span");
    const cls = n === q.answer ? "right" : q.partial?.[n] ? "partial" : "";
    cols.push({ n, bar, count, node: el("div", { className: cls }, [count, bar, label]) });
  }
  panel.append(el("div", { className: "q-hist" }, cols.map((c) => c.node)),
    el("div", { className: "q-equation", text: q.revealNote || `Respuesta: ${q.answer}` }));
  return {
    node: panel,
    update(t) {
      const max = Math.max(1, ...Object.values(t.histogram));
      for (const c of cols) {
        const n = t.histogram[c.n] || 0;
        c.bar.style.height = `${(n / max) * 100}%`;
        c.count.textContent = n ? String(n) : "";
      }
    },
  };
}

// ------------------------------------------------------------------ completa los que faltan
function multiPanel(q, reveal) {
  const known = q.given.map((g) => el("span", { className: "q-chip", text: g }));
  const missing = q.answer.map((i) => el("span", {
    className: `q-chip ${reveal ? "found" : "missing"}`, text: reveal ? q.options[i] : "?",
  }));
  const cards = optionCards(q.options, { correct: q.answer, reveal, columns: 3 });
  return {
    node: el("div", { className: "q-panel" }, [el("div", { className: "q-chiprow" }, [...known, ...missing]), cards.node]),
    update: (t, { live }) => cards.update(t.counts, t.answered, reveal || live),
  };
}

// ------------------------------------------------------------------ clasificar
function classifyPanel(q, reveal) {
  const colors = GRID_COLORS.classify;
  const legend = el("div", { className: "q-chiprow" }, q.columns.map((c, i) => {
    const chip = el("span", { className: "q-chip", text: c });
    chip.style.setProperty("--c", colors[i]);
    return chip;
  }));
  const pcts = [];
  const rows = q.rows.map((text, r) => {
    const cols = el("div", { className: "q-cols" });
    if (reveal) {
      const chip = el("span", { className: "q-col right", text: q.columns[q.answer[r]] });
      chip.style.setProperty("--c", colors[q.answer[r]]);
      const pct = el("span", { className: "q-rowpct" });
      pcts.push(pct);
      cols.append(chip, pct);
    } else {
      q.columns.forEach((c, i) => {
        const chip = el("span", { className: "q-col", text: c });
        chip.style.setProperty("--c", colors[i]);
        cols.append(chip);
      });
    }
    return el("div", { className: "q-row" }, [el("span", { text: text }), cols]);
  });
  return {
    node: el("div", { className: "q-panel" }, [reveal ? null : legend, el("div", { className: "q-grid" }, rows)]),
    update(t) {
      pcts.forEach((p, r) => { p.textContent = `${percent(t.rowCorrect[r], t.answered)} %`; });
    },
  };
}

// ------------------------------------------------------------------ emparejar
function matchPanel(q, reveal) {
  const colors = GRID_COLORS.match;
  const roleCard = (c) => {
    const card = el("div", { className: "q-card" }, [document.createTextNode(q.columns[c]), el("small", { text: q.columnHints?.[c] || "" })]);
    card.style.setProperty("--c", colors[c]);
    return card;
  };
  const links = [];
  const cells = q.rows.flatMap((row, r) => {
    const link = el("div", { className: "q-link", text: reveal ? "→" : "?" });
    links.push(link);
    const left = el("div", { className: "q-card", text: row });
    return [left, link, reveal ? roleCard(q.answer[r]) : roleCard(r)];
  });
  return {
    node: el("div", { className: "q-panel" }, [el("div", { className: "q-match" }, cells)]),
    update(t) {
      if (!reveal) return;
      links.forEach((l, r) => { l.textContent = `${percent(t.rowCorrect[r], t.answered)} %`; });
    },
  };
}

function colored(node, i) {
  node.style.setProperty("--c", OPTION_COLORS[i % OPTION_COLORS.length]);
  return node;
}

function show(node, visible) {
  node.hidden = !visible;
}
