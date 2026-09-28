# La Caja de Santiago

Un escape room 3D de ~5 minutos, pensado para el celular, hecho como invitación para **Santiago Laguna**.
Vite + React + TypeScript + Three.js. Todo es procedural (geometría, texturas en canvas, sonidos con Web Audio):
no hay assets externos ni backend.

**En línea:** https://rafafdz.github.io/santiago-escape/

## Comandos

```bash
npm install        # instala dependencias
npm run dev        # servidor de desarrollo → http://localhost:5173/
npm test           # tests del puzzle (vitest)
npm run build      # typecheck + build de producción en dist/
npm run preview    # sirve dist/ → http://localhost:4173/santiago-escape/
```

El build usa `base: '/santiago-escape/'` (GitHub Pages). Para otro hosting en la raíz: `BASE_PATH=/ npm run build`.

## Deploy

`.github/workflows/deploy.yml` construye y publica en GitHub Pages en cada push a `main`
(Settings → Pages → Source: *GitHub Actions*).

## Solución (solo para el anfitrión — no aparece en la interfaz)

1. **Bolsa de magnesio** (izquierda, brilla primero): tocar → *Meter la mano*. Sale una ficha de bronce
   con una montaña y “LAGUNA”. Su grabado dice que cada bandera roja del muro es una cumbre (I, II, III) y que
   el número de cada cumbre son las **presas azules** de su tramo. También dice que la cuerda une el muro con la caja.
2. **Muro de escalada** (al fondo): sigue la línea punteada de magnesio desde la BASE.
   - BASE → bandera I: **4** presas azules
   - I → II: **7** presas azules
   - II → III: **2** presas azules
   Las presas naranjas y grises son distractores. Se pueden tocar las azules para marcarlas y no perder la cuenta.
3. **Caja fuerte**: la cuerda azul lleva del muro a la manija. Código **4 – 7 – 2**.
   Gira el dial (arrastrar, flechas ◀ ▶, tocar un número, o teclado ←/→ y dígitos), *Fijar* cada número.

El código no está escrito a mano: `deriveCode()` en `src/game/puzzle.ts` lo calcula contando las presas del mismo
dato que dibuja el muro 3D y la vista 2D, así que la pista y la respuesta no pueden desincronizarse (hay un test).

**Pista única** (botón de ampolleta o en la caja): cambia según el progreso — manda a la bolsa, luego al muro,
y en la etapa final explica qué contar y regala el primer dígito (4).

**Sin castigos**: un código incorrecto sacude el dial y permite reintentar. Si el reloj de 5:00 llega a cero,
aparece un aviso amable y el juego sigue en “tiempo extra”.

## Personalizar

- `src/config.ts` — nombre y el texto de la invitación final (cuándo, dónde, qué llevar, firma).
  Cámbialo con los datos reales del escape room antes de mandar el link.
- `src/game/puzzle.ts` — posiciones de presas/banderas. Si cambias la ruta, el código cambia solo; actualiza el
  test `puzzle.test.ts` y esta sección.

## Estructura

```
src/
  App.tsx              estado del juego y orquestación de diálogos
  config.ts            textos editables de la invitación
  game/puzzle.ts       datos de la ruta, código derivado, helpers del dial (+ puzzle.test.ts)
  game/state.ts        reducer, objetivo, progreso, pista contextual
  game/audio.ts        clicks/golpes/campanitas con Web Audio + vibración
  scene/EscapeScene.ts diorama Three.js (mesa, caja fuerte con puerta animada, bolsa, muro, cuerda, lámpara)
  scene/textures.ts    texturas procedurales en canvas
  scene/SceneView.tsx  puente React ↔ Three y etiquetas accesibles sobre los objetos
  ui/                  intro, HUD, bolsa, muro, caja fuerte (dial), invitación, modal accesible
```

## Accesibilidad y rendimiento

- Cada objeto 3D tiene una etiqueta-botón (≥44 px) que funciona con teclado y lector de pantalla.
- Diálogos con `aria-modal`, foco atrapado, `Esc` para cerrar; el dial es un `role="slider"` con flechas/Enter/Retroceso.
- `prefers-reduced-motion`: sin animaciones de cámara/polvo/confeti; la puerta se abre sin animación.
- Pixel ratio máximo 2, una sola luz con sombras, ~90 partículas; sin post-procesado.
