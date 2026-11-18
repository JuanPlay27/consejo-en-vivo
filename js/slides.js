// Diapositivas de explicación: la casilla de la infografía en grande, para presentar al frente.
// Cada tipo (kind) de SLIDES en content.js tiene aquí su forma de dibujarse, en dos versiones:
//  - incompleta (partial): introduce el tema y deja con "?" justo lo que se va a preguntar;
//  - completa: muestra todo, y lo que antes estaba oculto aparece con una animación.

import { PHASES } from "./content.js";
import { el, novaSvg } from "./ui.js";

// Íconos de trazo propios (los mismos de la infografía). Solo markup fijo.
const ICONS = {
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/>',
  leaf: '<path d="M5 19c0-8 6-14 15-14 0 9-6 15-15 14z"/><path d="M5 19l8-8"/>',
  scale: '<path d="M12 4v16"/><path d="M8 20h8"/><path d="M5 7h14"/><path d="M5 7l-3 6c0 1.7 1.3 3 3 3s3-1.3 3-3z"/><path d="M19 7l-3 6c0 1.7 1.3 3 3 3s3-1.3 3-3z"/>',
  shield: '<path d="M12 3l7 3v5.5c0 4.4-3 7.7-7 9.5-4-1.8-7-5.1-7-9.5V6z"/><path d="M9 12l2 2 4-4"/>',
  gear: '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="6.5"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
  landmark: '<path d="M3 21h18"/><path d="M5 21v-9M10 21v-9M14 21v-9M19 21v-9"/><path d="M2.5 9L12 3.5 21.5 9z"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  cross: '<path d="M7 7l10 10"/><path d="M17 7L7 17"/>',
  flag: '<path d="M5 21V4"/><path d="M5 4h12l-2.5 4L17 12H5"/>',
  chevron: '<path d="M9 6l6 6-6 6"/>',
};

function icon(name, color = "currentColor", size = "1em") {
  const span = el("span", { className: "s-icon", attrs: { "aria-hidden": "true" } });
  span.innerHTML = `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="${color}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;
  span.style.color = color;
  return span;
}

/** Convierte "texto con **negrita**" en nodos, sin interpretar HTML. */
function rich(text) {
  return text.split("**").map((part, i) => (i % 2 ? el("b", { text: part }) : document.createTextNode(part)));
}

export function buildSlide(slide, { partial = false } = {}) {
  const builders = { intro, "que-es": queEs, modelo, marco, beneficios, ia, conclusiones };
  return builders[slide.kind](slide, partial);
}

/** Hueco con "?" en la versión incompleta. */
function mystery(className, text = "?") {
  return el("div", { className: `${className} s-hidden` }, [el("span", { className: "s-q", text })]);
}

/** Lo que estaba oculto aparece con animación en la versión completa. */
function fresh(node, wasHidden) {
  if (wasHidden) node.classList.add("s-new");
  return node;
}

/** Invitación a responder, solo en la versión incompleta. */
function cue(slide, partial) {
  return partial && slide.cue ? el("div", { className: "s-cue" }, [document.createTextNode(slide.cue), el("b", { text: "📱" })]) : null;
}

/** Marco común: la "carretera" punteada de la infografía con la ficha de la casilla. */
function frame(slide, children, partial = false) {
  const ph = PHASES[slide.phase];
  const token = el("div", { className: "s-token", text: ph.num });
  token.style.setProperty("--phase", ph.color);
  const nova = el("div", { className: "s-road-nova" });
  nova.innerHTML = novaSvg("happy", "bob");
  return el("section", { className: "slide" }, [
    el("div", { className: "s-road", attrs: { "aria-hidden": "true" } }, [token, nova]),
    el("div", { className: `s-card${partial ? " partial" : ""}` }, children.filter(Boolean)),
  ]);
}

function title(slide, extra) {
  return el("div", { className: "s-head" }, [
    slide.kind === "conclusiones" ? icon("flag", "#15803d") : null,
    el("h2", { className: "s-title", text: slide.title }),
    slide.tag ? el("span", { className: "s-tag", text: slide.tag }) : null,
    extra || null,
  ]);
}

const label = (text) => el("p", { className: "s-label", text });

// ------------------------------------------------------------------ cada diapositiva
function intro(slide) {
  const bubble = el("div", { className: "s-bubble" }, [
    el("span", { className: "s-bubble-name", text: "Nova · Asistente de IA" }),
    el("p", {}, [document.createTextNode(`${slide.quote} `), el("mark", { text: slide.highlight })]),
  ]);
  const nova = el("div", { className: "s-intro-nova" });
  nova.innerHTML = novaSvg("happy", "bob");
  return el("section", { className: "slide s-intro" }, [
    el("div", { className: "s-intro-text" }, [
      el("div", { className: "s-tags" }, slide.tags.map((t, i) => el("span", { className: i === 0 ? "s-pill pink" : "s-pill", text: t }))),
      el("h1", {}, [document.createTextNode("ISO/IEC "), el("span", { text: "38500" })]),
      el("p", { className: "s-sub", text: slide.subtitle }),
    ]),
    el("div", { className: "s-intro-side" }, [bubble, nova]),
  ]);
}

function queEs(slide, partial) {
  const medals = slide.results.map((r, i) => {
    if (partial) return mystery("s-medal", `${i + 1}`);
    const circle = el("span", { className: "s-medal-icon" }, [icon(r.icon, "#101040", "1.3em")]);
    circle.style.background = r.color;
    const card = el("div", { className: "s-medal" }, [circle, el("b", { text: r.name }), el("span", { text: r.desc })]);
    card.style.background = r.tint;
    card.style.animationDelay = `${0.75 + i * 0.15}s`;
    return fresh(card, true);
  });
  return frame(slide, [
    title(slide),
    el("p", { className: "s-text" }, rich(slide.text)),
    label(slide.label),
    el("div", { className: "s-medals" }, medals),
    cue(slide, partial),
  ], partial);
}

function modelo(slide, partial) {
  const steps = [];
  slide.model.forEach((m, i) => {
    if (i > 0) steps.push(icon("chevron", "#6b6a90", "1.6em"));
    if (partial) { steps.push(mystery("s-step", String(i + 1))); return; }
    const chip = el("div", { className: `s-step${m.badge ? " new" : ""}` }, [
      el("span", { className: "s-chip", text: m.name }),
      el("small", { text: m.desc }),
    ]);
    chip.firstChild.style.background = m.color;
    if (m.badge) chip.append(el("span", { className: "s-badge", text: m.badge }));
    chip.style.animationDelay = `${0.75 + i * 0.15}s`;
    steps.push(fresh(chip, true));
  });
  const rows = slide.principles.map((p) => {
    const dots = el("span", { className: "s-dots", attrs: { "aria-hidden": "true" } },
      Array.from({ length: p.count }, () => el("i", { style: { background: p.color } })));
    return el("div", { className: "s-prow" }, [
      dots,
      el("b", { text: `${p.count} ${p.label}` }),
      el("span", { text: p.names.join(" · ") }),
    ]);
  });
  return frame(slide, [
    title(slide),
    label(slide.modelLabel),
    el("div", { className: "s-model" }, steps),
    label(slide.principlesLabel),
    el("div", { className: "s-principles" }, rows),
    el("p", { className: "s-note", text: slide.note }),
    cue(slide, partial),
  ], partial);
}

function marco(slide, partial) {
  const cards = slide.frame.map((f) => {
    if (partial && f.missing) return mystery("s-frame");
    return fresh(el("div", { className: `s-frame${f.missing && !partial ? " missing" : ""}` }, [
      el("b", { text: f.name }), el("span", { text: f.desc }),
    ]), f.missing);
  });
  return frame(slide, [
    title(slide),
    label(slide.frameLabel),
    el("div", { className: "s-frames" }, cards),
    el("div", { className: "s-family-row" }, [label(slide.familyLabel), ...slide.family.map((f) => el("span", { text: f }))]),
    cue(slide, partial),
  ], partial);
}

function beneficios(slide, partial) {
  const list = (items, kind) => el("ul", { className: `s-list ${kind}` }, items.map((item) => {
    if (partial && item.hide) return el("li", { className: "s-hidden-line" }, [el("span", { className: "s-q", text: "?" })]);
    return fresh(el("li", {}, [
      icon(kind === "pros" ? "check" : "cross", kind === "pros" ? "#15803d" : "#c2410c", "1.2em"), document.createTextNode(item.text),
    ]), item.hide);
  }));
  return frame(slide, [
    title(slide),
    el("div", { className: "s-two" }, [list(slide.pros, "pros"), list(slide.cons, "cons")]),
    partial ? null : fresh(el("p", { className: "s-text small" }, rich(slide.note)), true),
    cue(slide, partial),
  ], partial);
}

function ia(slide, partial) {
  const blocks = slide.blocks.map((b) => {
    const code = partial
      ? el("div", { className: "s-block-code s-code-hidden", text: "¿Qué norma?" })
      : fresh(el("div", { className: "s-block-code", text: b.code }), true);
    const box = el("div", { className: `s-block${b.dashed ? " dashed" : ""}` }, [
      el("div", { className: "s-block-label" }, [icon(b.icon, b.ink, "1.3em"), document.createTextNode(b.label)]),
      code,
      el("p", { text: partial && b.introText ? b.introText : b.text }),
    ]);
    box.style.background = b.tint;
    box.style.borderColor = b.color;
    box.querySelector(".s-block-label").style.color = b.ink;
    return box;
  });
  return frame(slide, [title(slide), el("div", { className: "s-blocks" }, blocks), cue(slide, partial)], partial);
}

function conclusiones(slide) {
  const items = slide.items.map((t, i) => el("li", {}, [el("span", { className: "s-num", text: String(i + 1) }), document.createTextNode(t)]));
  return frame(slide, [
    title(slide),
    el("p", { className: "s-text" }, rich(slide.text)),
    label(slide.label),
    el("ol", { className: "s-recs" }, items),
    el("div", { className: "s-next", text: slide.next }),
  ]);
}
