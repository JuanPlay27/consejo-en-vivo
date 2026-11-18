// ============================================================
//  CONFIGURACIÓN de "Consejo en vivo".
//  FIREBASE_CONFIG ya viene copiado del juego del mapa: es el MISMO proyecto de Firebase.
// ============================================================

// Mismos datos que en mapa-del-consejo/js/config.js (no son secretos; los protegen las reglas).
export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyAuTt96EZFVfjilHC66vD5aIL7nolZVS10",
  authDomain: "mapa-del-consejo.firebaseapp.com",
  databaseURL: "https://mapa-del-consejo-default-rtdb.firebaseio.com",
  projectId: "mapa-del-consejo",
  storageBucket: "mapa-del-consejo.firebasestorage.app",
  messagingSenderId: "559834743783",
  appId: "1:559834743783:web:09118ad0fadcc640ba3342"
};

// Clave para que SOLO el computador del proyector vea los controles: pantalla.html?clave=consejo2026
export const HOST_KEY = "consejo2026";

// Mostrar en vivo cuántas personas van eligiendo cada opción (se puede cambiar con la tecla D).
export const LIVE_COUNTS = true;

// Puntos por respuesta correcta (las parciales dan la mitad).
export const POINTS_CORRECT = 1000;

// Versión fija del SDK de Firebase que se carga desde el CDN oficial de Google.
export const FIREBASE_SDK_VERSION = "13.3.0";

// Nodo dentro de la base de datos. El juego del mapa usa "mapa"; este usa "quiz".
export const DB_ROOT = "quiz";
