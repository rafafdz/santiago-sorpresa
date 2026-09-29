# La Caja de Santiago

Un escape room 3D de ~5 minutos, pensado para el celular, hecho como invitación para **Santiago Laguna**
de parte de **Rafa · Tomás C · Tomás P**.
Vite + React + TypeScript + Three.js. Todo es procedural (geometría, texturas en canvas, sonidos con Web Audio):
no hay assets externos ni backend.

**En línea:** https://rafafdz.github.io/santiago-sorpresa/

## Comandos

```bash
npm install        # instala dependencias
npm run dev        # servidor de desarrollo → http://localhost:5173/
npm test           # tests del puzzle (vitest)
npm run build      # typecheck + build de producción en dist/
npm run preview    # sirve dist/ → http://localhost:4173/santiago-sorpresa/
npm run smoke      # (tras build) juega todo en Chromium: escritorio WebGL2, Android WebGL2 y WebGL1, contexto perdido, sin WebGL
```

`npm run smoke` necesita un Chromium: define `CHROME_PATH=/ruta/a/chrome` o instala uno con
`npx playwright-core install chromium`.

El build usa `base: '/santiago-sorpresa/'` (GitHub Pages). Para otro hosting en la raíz: `BASE_PATH=/ npm run build`.

## Deploy

`.github/workflows/deploy.yml` corre los tests, construye y publica en GitHub Pages en cada push a `main`
(Settings → Pages → Source: *GitHub Actions*). Repo: `rafafdz/santiago-sorpresa`.

## 3D en Android: WebGL2 → WebGL1

El juego es **siempre 3D** y necesita WebGL (no hay vista alternativa 2D).

- **three.js fijado en r162** (`"three": "0.162.0"`): es la última versión cuyo `WebGLRenderer` funciona con
  **WebGL1**; desde r163 exige WebGL2. No actualizar three sin revisar esto.
- `src/scene/webgl.ts` crea el contexto en el canvas probando `webgl2` → `webgl` → `experimental-webgl` y se lo
  pasa al renderer. La versión usada queda en `canvas[data-webgl]`.
- Presupuesto por dispositivo (`rendererSettings`): en celulares pixel ratio máx. **1.5**, MSAA (casi gratis en GPUs
  móviles por tiles), sombras PCF de 512 px y anisotropía 2; en escritorio pixel ratio máx. 2, MSAA y sombras
  suaves de 1024 px. Misma escena, materiales PBR, reflejos (mapa de entorno procedural) y tone mapping ACES con
  salida sRGB en todos. Sin post-procesado.
- **Contexto perdido** (`webglcontextlost`): se pausa el render y se muestra “Recuperando los gráficos 3D…”. Si el
  navegador lo restaura, se reconstruye el mapa de entorno y se sigue; si no lo hace en 3 s, se recrea el canvas.
  El avance del juego vive en React, así que nunca se pierde.
- **Sin WebGL**: mensaje claro con qué hacer (activar la aceleración gráfica o abrir Chrome/Firefox actualizados) y
  botón “Reintentar”.
- three.js va en un chunk aparte (`React.lazy`) para que la intro aparezca antes de parsear el renderer.

## Solución (solo para el anfitrión — no aparece en la interfaz)

1. **Bolsa de magnesio** (izquierda, brilla primero): tocar → *Meter la mano*. Sale una ficha de bronce
   con una montaña y “LAGUNA”. El grabado dice:
   > Sube solo por el color del agua. · Cada bandera guarda lo que pisaste para alcanzarla. ·
   > Y la clave se lee como corre el agua: de la nieve a la laguna.
2. **Muro de escalada** (al fondo): tiene nieve pintada arriba, una laguna abajo y una línea punteada de
   magnesio que sube desde la laguna. Tres banderas rojas (sin números) la cortan en tres tramos. Sobre la línea
   hay presas azules y algunas grises; fuera de la línea hay naranjas y grises de relleno.
   - “Color del agua” = **azul**: solo cuentan las presas azules de la línea (las grises de la línea no).
   - Presas azules por tramo, subiendo: laguna → 1ª bandera **4**, → 2ª bandera **7**, → bandera de la nieve **2**.
   - “De la nieve a la laguna” = se lee de arriba hacia abajo.
3. **Caja fuerte** (la cuerda azul lleva del muro a la manija): código **2 – 7 – 4**.
   Gira el dial (arrastrar, flechas ◀ ▶, tocar un número, o teclado ←/→ y dígitos) y *Fijar* cada número.

El código no está escrito a mano: `deriveCode()` en `src/game/puzzle.ts` cuenta las presas azules por tramo y las
ordena por la altura de cada bandera, a partir de los mismos datos que dibujan el muro 3D y el diálogo del muro (hay tests).

**Errores sin castigo, con retroalimentación que no revela el código** (`diagnose()`):
- números correctos en otro orden (p. ej. 4-7-2): “suenan bien, pero no en ese orden”;
- contar todas las presas de la línea (5-9-3 o 3-9-5): “en cada tramo sobra algo: no todo es del color del agua”;
- cualquier otro: el dial se sacude y se puede reintentar.

**Pista única** (botón de ampolleta o en la caja), según el progreso: manda a la bolsa → al muro (nieve y laguna)
→ en la etapa final explica que el agua es azul, que las grises de la línea no cuentan y que se lee desde la bandera
de la nieve hacia la laguna. Nunca muestra dígitos.

El reloj es de 5:00; si llega a cero aparece un aviso amable y el juego sigue en “tiempo extra”.

## Personalizar

- `src/config.ts` — nombre, firmantes (`FRIENDS`) y textos de la invitación final. La fecha queda abierta
  (“Lo coordinamos entre todos”) a propósito.
- `src/game/puzzle.ts` — presas, banderas y tramos. Si cambias la ruta, el código cambia solo; actualiza
  `puzzle.test.ts` y esta sección.

## Estructura

```
src/
  App.tsx              estado del juego y orquestación de diálogos
  config.ts            textos editables de la invitación y firmantes
  game/puzzle.ts       datos de la ruta, código derivado, diagnóstico de errores, helpers del dial (+ tests)
  game/wallArt.ts      formas compartidas del muro (nieve, laguna, banderas)
  game/state.ts        reducer, objetivo, progreso, pista contextual
  game/audio.ts        clicks/golpes/campanitas con Web Audio + vibración
  scene/EscapeScene.ts diorama Three.js (mesa, caja fuerte con puerta animada, bolsa, muro, cuerda, lámpara)
  scene/textures.ts    texturas procedurales en canvas
  scene/SceneView.tsx  vista 3D (carga diferida): puente React ↔ Three, etiquetas accesibles, estados de GPU
  scene/webgl.ts       contexto WebGL2→WebGL1, ajustes por dispositivo, contexto perdido (+ webgl.test.ts)
  ui/WallBoard.tsx     tablero del muro (SVG) del diálogo
  ui/                  intro, HUD, bolsa, muro, caja fuerte (dial), invitación, modal accesible
scripts/smoke.mjs      smoke test end-to-end con Playwright
```

## Accesibilidad y rendimiento

- Cada objeto 3D tiene una etiqueta-botón (≥44 px) que funciona con teclado y lector de pantalla; cada presa del
  muro es un botón con color y posición descritos.
- Diálogos con `aria-modal`, foco atrapado, `Esc` para cerrar; el dial es un `role="slider"` con flechas/Enter/Retroceso.
- `prefers-reduced-motion`: sin animaciones de cámara/polvo/confeti; la puerta se abre sin animación.
- Pixel ratio máximo 1.5 en celulares y 2 en escritorio, una sola luz con sombras, ~90 partículas; sin post-procesado.
