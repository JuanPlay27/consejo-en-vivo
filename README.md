# Consejo en vivo · Cuestionario ISO/IEC 38500

Cuestionario en vivo, al estilo Kahoot, que recorre **casilla por casilla la infografía** (Grupo 2, Gestión de TIC, UFPS). Está pensado para **20 a 30 personas**.

**Cómo funciona:**

1. La gente entra por un QR **de forma anónima**: recibe un nombre al azar, como "Búho Ético".
2. Primero se proyecta la **idea clave** (ISO/IEC 38500: las decisiones sobre TI las toma la alta dirección).
3. Cada tema de la infografía se presenta **en tres tiempos**:
   1. **Introducción:** la diapositiva aparece **incompleta**. Muestra lo necesario para introducir el tema y deja con "?" justo lo que se va a preguntar. Alguien del equipo lo explica parcialmente.
   2. **Pregunta:** todos responden en el celular. La pantalla muestra cuántos van respondiendo y qué elige el salón; al acabar el tiempo se revela la correcta.
   3. **Explicación:** vuelve la misma diapositiva, ahora **completa**. Lo que estaba oculto aparece con una animación y se termina de explicar.
4. Cada paso entra deslizándose desde la derecha con **Espacio**.
5. Al final aparecen el **podio** y la diapositiva de **conclusiones**, y de ahí pasan al video.

## El recorrido

| Paso | Introducción (incompleta) | Pregunta y mecánica | Explicación (completa) |
|---|---|---|---|
| Inicio | ★ **Idea clave** | — | — |
| 1 · ¿Qué es? | Definición; los 3 resultados en "?" | Los 3 resultados · *opción única* · 20 s | Aparecen los 3 resultados |
| 2 · Componentes | Los 11 principios; el modelo en "? › ? › ? › ?" | Orden del modelo · *ordena las burbujas* · 25 s | Evaluar › Dirigir › Monitorear › Involucrar |
| 2 · Componentes | 4 elementos del marco y 2 en "?" | Los 2 que faltan · *completa los que faltan* · 25 s | Desempeño y Rendición de cuentas, marcados "Faltaban" |
| 3 · Beneficios y límites | 1 beneficio y 1 límite; el resto en "?" | ¿Beneficio, límite o falso? · *clasifica* · 30 s | Todos, más "no reemplaza a COBIT" |
| 5 · ¿Y la IA? | Gobierna / Gestiona / Obliga, sin la norma | Norma ↔ descripción · *empareja* · 30 s | Aparecen 38500 + 38507, 42001 y UE 2024/1689 |
| Final | **Podio** → **Conclusiones** → video | | |

**Duración aproximada:** 1 minuto para entrar y unos 2,5 minutos por tema (30 s de introducción, la pregunta y 1 minuto de explicación). En total, **entre 13 y 15 minutos**, más el video. Si el tiempo aprieta, acorten las introducciones.

**Puntos:** 1000 por respuesta correcta. En ordenar, completar, clasificar y emparejar hay puntos parciales. No cuenta la rapidez: la idea es que piensen.

## ¿Hay que crear otro proyecto en Firebase?

**No.** Usan el **mismo proyecto y la misma base de datos** del mapa del Consejo. Cada juego guarda sus datos en un nodo distinto: el mapa en `mapa` y este en `quiz`.

`js/config.js` **ya viene lleno** con la configuración de su proyecto `mapa-del-consejo`, copiada de su repo. Lo único que tienen que hacer en Firebase es **actualizar las reglas** (paso 1).

| Archivo | Para qué sirve |
|---|---|
| `index.html` | Lo que ven los celulares (adonde lleva el QR). |
| `pantalla.html` | Lo que se proyecta: QR, diapositivas, preguntas, conteo, revelado y podio. |
| `js/content.js` | Las preguntas, las diapositivas (`SLIDES`) y el orden del recorrido (`FLOW`). |
| `js/config.js` | La configuración de Firebase (ya llena), la clave del anfitrión y los puntos. |
| `database.rules.json` | Las reglas nuevas, que incluyen las del mapa **y** las del cuestionario. |

---

## Paso 0 · Pruébenlo ya, sin Firebase (modo ensayo)

1. Descompriman el zip. Ojo: Windows suele dejar una carpeta dentro de otra (`consejo-en-vivo\consejo-en-vivo`). La buena es **la que tiene `index.html`**.
2. Abran una terminal en esa carpeta e inicien el servidor (las comillas son por el espacio en "Juan David"):

   ```
   cd "C:\Users\Juan David\Documents\UNI\Noveno\Tics\consejo-en-vivo\consejo-en-vivo"
   py -m http.server 8080
   ```

3. En Chrome abran la pantalla: `http://localhost:8080/pantalla.html?demo&clave=consejo2026`
4. En otras pestañas abran jugadores: `http://localhost:8080/?demo`. Cada pestaña es una persona distinta.
5. En la pantalla pulsen **+5 bots de ensayo** unas cuantas veces, luego **Empezar (E)**, y avancen con **Espacio** (con **←** se vuelve atrás).

> No funciona abriendo los archivos con doble clic (`file://`). Usen siempre `http://localhost:8080`.

## Paso 1 · Actualizar las reglas de Firebase (obligatorio)

Las reglas actuales solo permiten el nodo `mapa`. Si no las actualizan, el cuestionario mostrará el error `PERMISSION_DENIED`.

1. Entren a **https://console.firebase.google.com** con la **misma cuenta** del mapa y abran el proyecto `mapa-del-consejo`.
2. Vayan a **Realtime Database**, pestaña **Reglas**.
3. **Borren todo**, peguen el contenido completo de `database.rules.json` y den **Publicar**.

Las reglas nuevas:

- Mantienen el mapa funcionando igual.
- Habilitan el cuestionario.
- Impiden cambiar una respuesta ya enviada (la primera respuesta queda fija).
- Se cierran solas el **1 de diciembre de 2026**.

## Paso 2 · Revisar la configuración (ya viene lista)

Abran `js/config.js`. Deben ver su `FIREBASE_CONFIG` con `databaseURL: "https://mapa-del-consejo-default-rtdb.firebaseio.com"`. No tienen que cambiar nada.

> Si algún día cambian de proyecto de Firebase, copien el bloque `FIREBASE_CONFIG` de `mapa-del-consejo/js/config.js`, que es exactamente el mismo.

## Paso 3 · Probar en local con Firebase real

1. Con el servidor del paso 0 corriendo, abran `http://localhost:8080/pantalla.html?clave=consejo2026` (**sin** `?demo`). La etiqueta naranja **MODO ENSAYO** no debe aparecer.
2. Abran `http://localhost:8080/` en una **ventana de incógnito** (Ctrl + Shift + N) y den **Entrar**.
3. En la pantalla, el contador debe pasar a **1** y su nombre secreto debe aparecer.
4. En Firebase, en **Realtime Database → Datos**, debe aparecer un nodo nuevo `quiz → players` con ese jugador, al lado del `mapa`.

## Paso 4 · Publicar en GitHub Pages (igual que el mapa)

1. Vayan a **https://github.com/new**:
   - Nombre: `consejo-en-vivo`.
   - **Public**.
   - Sin README. Den **Create repository**.
2. Hagan clic en **uploading an existing file**. Arrastren **el contenido** de la carpeta que tiene `index.html` (`index.html`, `pantalla.html`, `README.md`, `database.rules.json`, `package.json` y las carpetas `css`, `js` y `tests`). Den **Commit changes**.
3. Comprueben que en la raíz del repo se vean `index.html`, `css/` y `js/`. No debe quedar todo dentro de una carpeta.
4. Vayan a **Settings → Pages**. En **Source** elijan **Deploy from a branch**. En *Branch* elijan **main** y **/ (root)**, y den **Save**.
5. Esperen de 1 a 3 minutos.

**Sus direcciones** (con su usuario `juanplay27`, **no** con "su-usuario"):

- **Proyector:** `https://juanplay27.github.io/consejo-en-vivo/pantalla.html?clave=consejo2026`
- **Celulares:** el QR de la pantalla ya apunta a `https://juanplay27.github.io/consejo-en-vivo/`

### ¿Ya lo habían subido? Actualizarlo

Si el repo `consejo-en-vivo` ya existe en GitHub:

1. Entren al repo y den **Add file → Upload files**.
2. Arrastren de nuevo **el contenido** de la carpeta. GitHub reemplaza los archivos que cambiaron y agrega los nuevos, como `js/slides.js`.
3. Den **Commit changes**, esperen 1 o 2 minutos y recarguen la pantalla con **Ctrl + F5**.

## Paso 5 · Ensayo general

- [ ] Abran la pantalla del proyector desde la dirección de GitHub Pages.
- [ ] Entren con 2 o 3 celulares reales por el QR: uno con datos móviles y otro con wifi.
- [ ] Pulsen **+5 bots** 4 veces, luego **E**, y recorran todo avanzando con **Espacio**.
- [ ] En cada diapositiva, quien le toque practica la explicación en voz alta con el guion de abajo. Tomen el tiempo.
- [ ] Al final: **Quitar bots (X)** y **Reiniciar (R R)**.

## El día de la presentación

1. **Antes:** abran la pantalla con la clave y pulsen **F** (pantalla completa) y **R R** (reiniciar). Comprueben que no queden bots.
2. **QR:** den unos 60 segundos para que entren todos y miren el contador.
3. **E** para empezar: aparece la diapositiva **Idea clave**. Preséntenla y pulsen **Espacio**.
4. **Introducción:** entra la diapositiva incompleta y quien le toque introduce el tema. **Espacio**.
5. **Pregunta:** animen al salón: *"No importa equivocarse, ¡piensen cuál sería la más adecuada!"*. Cuando el reloj llega a 0 se revela sola. **Espacio**.
6. **Explicación:** vuelve la diapositiva, ahora completa, y se termina de explicar. **Espacio** para el siguiente tema.
7. Después del último tema vienen el **podio** y, con **Espacio**, las **conclusiones**. Luego, el video.

| Tecla | Acción |
|---|---|
| **E** | Empezar (desde la sala de espera) |
| **Espacio** / **Enter** / **→** | Avanzar: revela la pregunta si está abierta; si no, pasa al siguiente paso |
| **←** | Volver al paso anterior (si era una pregunta, se muestra ya revelada y no se repite) |
| **D** | Mostrar u ocultar qué va eligiendo el salón en vivo |
| **Q** | Mostrar u ocultar el QR (para quien llegue tarde) |
| **R R** | Reiniciar (pulsar dos veces) |
| **B** / **X** | Agregar 5 bots de ensayo / quitarlos |
| **H** · **M** · **F** | Panel del anfitrión · sonido · pantalla completa |

### Guion y sugerencia de reparto

La rúbrica premia que **todos** participen. Cada tema lo presenta la misma persona en la introducción y en la explicación. Esta es solo una sugerencia; cámbienla como quieran.

| Tema | Presenta | Introducción (diapositiva incompleta, 30 s) | Explicación (diapositiva completa, 1 min) |
|---|---|---|---|
| ★ Idea clave | Juan David | — | Qué es la ISO/IEC 38500 (2024, JTC 1/SC 40). Su idea central: las decisiones sobre TI las toma la **alta dirección**. |
| 1 · ¿Qué es? | Juan David | Es una **guía de principios** para el órgano de gobierno; busca uso eficaz, eficiente y aceptable de las TI. "Busca 3 resultados… ¿cuáles?" | Los 3 resultados de la ISO 37000, con un ejemplo de cada uno. |
| 2 · Modelo y principios | Nicolás | Los **11 principios**: Propósito, 4 fundamentales y 6 habilitantes (antes eran 6). "El consejo hace 4 tareas… ¿en qué orden?" | **Evaluar → Dirigir → Monitorear**, y desde 2024 **Involucrar** a las partes interesadas. |
| 2 · Marco y familia | Juan Sebastián | El **marco** es donde gobierno y gestión operan juntos. Repasar los 4 elementos visibles y la familia de normas. | Los 2 que faltaban: **desempeño** y **rendición de cuentas**. |
| 3 · Beneficios y límites | Laura | Un beneficio (más transparencia) y un límite (barreras de liderazgo y personal). "¿Qué más será beneficio, límite… o falso?" | El resto, y lo falso: **no reemplaza** a COBIT ni a ISO 27001, los complementa. |
| 5 · ¿Y la IA? | Anyela | La diferencia entre **gobernar**, **gestionar** y **obligar**. "¿Qué norma hace cada cosa?" | 38500 + 38507 gobiernan, 42001 gestiona (PHVA) y el Reglamento (UE) 2024/1689 obliga. |
| 6 · Conclusiones | Todo el equipo | — | La norma dice el **qué** y los marcos el **cómo**. Las 3 recomendaciones, y paso al video. |

## Si algo falla

| Síntoma | Solución |
|---|---|
| `PERMISSION_DENIED` en la consola (F12) | Falta el **paso 1**: publicar las reglas nuevas. |
| Se queda en "Conectando…" | Revisen la `databaseURL` en `js/config.js` y recarguen con **Ctrl + F5**. |
| GitHub Pages muestra 404 | Revisen que la dirección diga **juanplay27** y no "su-usuario", y que `index.html` esté en la raíz del repo. |
| El QR apunta a `localhost` | Abrieron la pantalla desde el computador local. Ábranla desde la dirección `github.io`. |
| Alguien se quedó sin responder | No pasa nada: ve "Se acabó el tiempo" y sigue en la siguiente pregunta. |
| Pasaron una diapositiva sin querer | **←** vuelve al paso anterior. Si era una pregunta, se muestra ya revelada y no reparte puntos otra vez. |
| Hay que repetir todo | **R R** reinicia: borra respuestas y puntos, y deja a los conectados en la sala. |

**Límites del plan gratuito:** hasta 100 conexiones simultáneas. Para 30 personas más la pantalla sobra.

## Cambiar preguntas o diapositivas

Todo está en `js/content.js`:

- **`QUESTIONS`**: las preguntas. Cada una tiene:
  - `type`: `single` (con `style`: `choice`, `truefalse`, `bars` o `fill`), `order`, `number`, `multi` o `grid` (con `style`: `classify` o `match`).
  - `time`: el tiempo en segundos.
  - `answer`: la respuesta correcta.
- **`SLIDES`**: los textos de cada diapositiva. `**así**` se escribe en negrita. `cue` es la invitación a responder que sale en la introducción, y `hide` marca lo que se oculta en ella.
- **`FLOW`**: el orden del recorrido. Cada pregunta va entre su diapositiva incompleta (`partial: true`) y la misma completa.

`npm test` revisa que todo sea válido y que el recorrido esté bien armado.

## Para desarrolladores

Es un sitio estático con módulos ES y sin compilación. El modo ensayo y Firebase comparten la misma interfaz (`js/backend.js`).

- Las respuestas se guardan con **transacción**, así que la primera queda fija. Las reglas también impiden sobrescribirlas.
- Los puntos los calcula solo el anfitrión al revelar. El paso a "revelado" es otra transacción, para que nadie reciba puntos dos veces aunque haya dos pantallas abiertas.
- Pruebas: `npm test` para la lógica, la puntuación, el contenido y el recorrido. `python3 tests/e2e_demo.py`, con el servidor en el puerto 8080, hace el recorrido completo (incluido volver atrás) con 3 celulares y 20 bots y toma capturas. Requiere Playwright.
- Las diapositivas se dibujan en `js/slides.js` y las mecánicas de las preguntas en `js/panels.js`.
- Librería incluida: [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) (MIT). El SDK de Firebase se carga desde el CDN oficial de Google.
