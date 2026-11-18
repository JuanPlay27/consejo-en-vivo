// Capa de datos con la misma interfaz para dos modos:
//  - "firebase": Realtime Database real (la clase en vivo).
//  - "demo": todo en este navegador (pestañas sincronizadas), para ensayar sin internet.
// Así el resto del código no sabe ni le importa dónde viven los datos.

import { DB_ROOT, FIREBASE_CONFIG, FIREBASE_SDK_VERSION } from "./config.js";

export function isConfigFilled(config = FIREBASE_CONFIG) {
  return Object.values(config).every((v) => typeof v === "string" && v && !v.includes("PEGAR_AQUI"));
}

export function wantsDemo() {
  return new URLSearchParams(location.search).has("demo");
}

export async function createBackend() {
  if (wantsDemo()) return createDemoBackend();
  if (!isConfigFilled()) {
    throw new Error("Falta pegar la configuración de Firebase en js/config.js (README, paso 3).");
  }
  return createFirebaseBackend();
}

// ---------------------------------------------------------------- Firebase
async function createFirebaseBackend() {
  const base = `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}`;
  const { initializeApp } = await import(`${base}/firebase-app.js`);
  const fb = await import(`${base}/firebase-database.js`);
  const db = fb.getDatabase(initializeApp(FIREBASE_CONFIG));
  const r = (path) => fb.ref(db, path);

  let serverOffset = 0;
  fb.onValue(r(".info/serverTimeOffset"), (snap) => { serverOffset = snap.val() || 0; });

  return {
    mode: "firebase",
    listen: (path, cb) => fb.onValue(r(path), (snap) => cb(snap.val())),
    listenLast: (path, n, cb) =>
      fb.onValue(fb.query(r(path), fb.limitToLast(n)), (snap) => {
        const rows = [];
        snap.forEach((child) => { rows.push([child.key, child.val()]); });
        cb(rows);
      }),
    set: (path, value) => fb.set(r(path), value),
    update: (path, values) => fb.update(r(path), values),
    push: (path, value) => fb.push(r(path), value),
    remove: (path) => fb.remove(r(path)),
    async transaction(path, fn) {
      const result = await fb.runTransaction(r(path), fn);
      return { committed: result.committed, value: result.snapshot.val() };
    },
    async onDisconnectSet(path, value) {
      const handle = fb.onDisconnect(r(path));
      await handle.set(value);
      return { cancel: () => handle.cancel() };
    },
    onConnection: (cb) => fb.onValue(r(".info/connected"), (snap) => cb(snap.val() === true)),
    serverNow: () => Date.now() + serverOffset,
  };
}

// ---------------------------------------------------------------- Demo local
const DEMO_KEY = `${DB_ROOT}-demo-db`;

function createDemoBackend() {
  const channel = new BroadcastChannel(`${DB_ROOT}-demo`);
  const listeners = new Set();
  const disconnectWrites = new Map();

  const load = () => JSON.parse(localStorage.getItem(DEMO_KEY) || "{}");
  const parts = (path) => path.split("/").filter(Boolean);
  const read = (tree, path) => parts(path).reduce((node, k) => (node == null ? null : node[k] ?? null), tree);
  const clone = (v) => (v == null ? null : JSON.parse(JSON.stringify(v)));

  function writeAt(tree, path, value) {
    const keys = parts(path);
    const last = keys.pop();
    let node = tree;
    for (const k of keys) {
      if (typeof node[k] !== "object" || node[k] === null) node[k] = {};
      node = node[k];
    }
    if (value === null || value === undefined) delete node[last];
    else node[last] = clone(value);
  }

  // Un error en una vista no debe impedir que las demás se enteren del cambio.
  function notify() {
    const tree = load();
    for (const l of listeners) {
      try { l.check(tree); } catch (err) { console.error(err); }
    }
  }

  // Varias pestañas escriben el mismo JSON: sin un candado, una podría pisar el cambio de
  // otra (leer, modificar, guardar). Web Locks serializa las escrituras entre pestañas.
  async function commit(mutate) {
    const write = () => {
      const tree = load();
      mutate(tree);
      localStorage.setItem(DEMO_KEY, JSON.stringify(tree));
    };
    if (navigator.locks) await navigator.locks.request(DEMO_KEY, write);
    else write();
    notify();
    channel.postMessage("cambio");
  }

  channel.onmessage = notify;
  window.addEventListener("storage", (e) => { if (e.key === DEMO_KEY) notify(); });
  // Imita el onDisconnect de Firebase al cerrar la pestaña.
  const flushDisconnects = () => {
    if (disconnectWrites.size === 0) return;
    // Sin avisar a esta misma pestaña: si no, volvería a reclamar la ficha mientras se cierra.
    const tree = load();
    for (const [p, v] of disconnectWrites) writeAt(tree, p, v);
    disconnectWrites.clear();
    listeners.clear();
    localStorage.setItem(DEMO_KEY, JSON.stringify(tree));
    channel.postMessage("cambio");
  };
  window.addEventListener("pagehide", flushDisconnects);
  window.addEventListener("beforeunload", flushDisconnects);

  function addListener(select, cb) {
    const l = {
      last: undefined,
      check(tree) {
        const value = select(tree);
        const json = JSON.stringify(value);
        if (json !== l.last) { l.last = json; cb(clone(value)); }
      },
    };
    listeners.add(l);
    l.check(load());
    return () => listeners.delete(l);
  }

  let pushCounter = 0;
  const pushKey = () => `${Date.now().toString(36).padStart(9, "0")}${(pushCounter++).toString(36).padStart(4, "0")}${Math.random().toString(36).slice(2, 6)}`;

  return {
    mode: "demo",
    listen: (path, cb) => addListener((tree) => read(tree, path), cb),
    listenLast: (path, n, cb) =>
      addListener((tree) => Object.entries(read(tree, path) || {}).sort(([a], [b]) => (a < b ? -1 : 1)).slice(-n), cb),
    set: (path, value) => commit((tree) => writeAt(tree, path, value)),
    update: (path, values) =>
      commit((tree) => { for (const [k, v] of Object.entries(values)) writeAt(tree, `${path}/${k}`, v); }),
    async push(path, value) {
      const key = pushKey();
      await commit((tree) => writeAt(tree, `${path}/${key}`, value));
      return { key };
    },
    remove: (path) => commit((tree) => writeAt(tree, path, null)),
    async transaction(path, fn) {
      let result = { committed: false, value: null };
      await commit((tree) => {
        const current = clone(read(tree, path));
        const next = fn(current);
        if (next === undefined) { result = { committed: false, value: current }; return; }
        writeAt(tree, path, next);
        result = { committed: true, value: clone(next) };
      });
      return result;
    },
    async onDisconnectSet(path, value) {
      disconnectWrites.set(path, value);
      return { cancel: async () => { disconnectWrites.delete(path); } };
    },
    onConnection(cb) { cb(true); return () => {}; },
    serverNow: () => Date.now(),
  };
}
