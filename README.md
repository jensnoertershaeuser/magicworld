# ✨ Balthasars Zauberwelt

An interactive 3D world built by a dad and his son, one feature at a time.
Runs in any web browser. Built with [Three.js](https://threejs.org) and
[Vite](https://vitejs.dev).

This project replaces the earlier single-HTML-file prototype (kept in
`legacy/zauberwelt.html` for reference). The code is now split into small,
independent modules so it stays fast and easy to extend as the world grows.

---

## 1. Run it on your computer

You need **Node.js version 22 or newer** (the current LTS is perfect).
Get it from <https://nodejs.org> (pick the "LTS" download). Install it, then
restart your terminal.

Then, in this folder:

```bash
npm install      # one time: downloads Three.js + Vite
npm run dev      # starts a live preview, usually at http://localhost:5173
```

Open the link it prints. Every time you save a file, the browser updates
instantly. Press `Ctrl+C` in the terminal to stop.

To make a shareable build:

```bash
npm run build    # creates a "dist" folder you can host anywhere
npm run preview  # preview that build locally
```

---

## 2. How the project is organised

```
zauberwelt/
├── index.html              the page + on-screen title/hint
├── src/
│   ├── main.js             wires everything together (start here)
│   ├── engine/             the reusable machinery (rarely changes)
│   │   ├── renderer.js     nicer colours, shadows, hi-dpi
│   │   ├── scene.js        the scene + fog
│   │   ├── camera*.js      free-look camera, WASD, never sinks below ground
│   │   ├── lights.js       just 2 lights for the whole world (on purpose!)
│   │   └── loop.js         the animation loop + update registry
│   ├── world/              the environment
│   │   ├── sky.js          gradient sky + stars
│   │   ├── ground.js       hilly terrain + shared heightAt() helper
│   │   ├── occupancy.js    keep-out zones so nothing spawns inside anything
│   │   └── instancedForest.js   hundreds of trees in 2 draw calls
│   ├── entities/           the "things" that live in the world
│   │   └── character.js    a walking figure that animates itself
│   └── ui/                 everything on top of the canvas
│       ├── controls.js     the button bar
│       ├── device.js       "is this a phone?" (?mobile=1 forces it on)
│       ├── splash.js       fades out the launch logo
│       └── mobile.js       phone layout: rotate gate + arrow touch pads
└── legacy/zauberwelt.html  the old all-in-one prototype (for porting features)
```

**The golden rule that keeps it scalable:** a new thing (creature, machine,
building, effect) is its own file in `entities/` or `world/`. It builds itself,
adds itself to the scene, registers its own animation with `onUpdate(...)`, and
declares the ground it occupies with `reserve(...)`. You almost never edit
`main.js` except to add one `import` + one line.

### Keeping the forest out of things

`world/occupancy.js` holds the keep-out zones. Anything standing on the ground
claims its patch while it builds itself:

```js
import { reserve } from '../world/occupancy.js';
reserve(x, z, 6);   // nothing will be scattered within 6 units of (x, z)
```

The forest asks before planting each tree, so a new entity is fenced off
automatically — no edit to the forest. Reserve the space a thing *uses*, not
just the space it fills: a character that walks a circle of radius 14 reserves
all 14, or it walks through trunks.

This is why `main.js` builds the forest **last**: zones must exist before
anything is scattered.

### Adding a new thing (the pattern)

```js
import * as THREE from 'three';
import { onUpdate } from '../engine/loop.js';
import { heightAt } from '../world/ground.js';

export function addSparkleRock(scene, x, z) {
  const rock = new THREE.Mesh(
    new THREE.OctahedronGeometry(1.2),
    new THREE.MeshStandardMaterial({ color: 0xb06bff, emissive: 0xb06bff, emissiveIntensity: 0.6 })
  );
  rock.position.set(x, heightAt(x, z) + 1.2, z);
  scene.add(rock);

  onUpdate((dt, elapsed) => {           // <- animates itself, no central edits
    rock.rotation.y += dt;
    rock.position.y = heightAt(x, z) + 1.2 + Math.sin(elapsed) * 0.3;
  });
  return rock;
}
```

Then in `main.js`: `import { addSparkleRock } from './entities/sparkleRock.js';`
and `addSparkleRock(scene, 12, -8);`. Done.

---

## 3. Performance principles (how we reach "10x")

These four rules are why this version scales where the prototype did not:

1. **Instance anything repeated.** Trees, crystals, mushrooms, rocks, grass →
   one `InstancedMesh` each, not one mesh per object. See
   `world/instancedForest.js`. This is the single biggest win.
2. **Keep real lights to a handful (2–4).** Every light is expensive on every
   surface. For "glow", use an **emissive material**, which is nearly free.
   See `engine/lights.js`.
3. **Don't recompute geometry on the CPU every frame.** Waving flags/water
   should move in a shader, not by editing vertex arrays in JavaScript.
   (A `waving-material` helper is a good early addition.)
4. **Let Three.js cull and, later, add LOD.** Distant mountains/props can use
   cheaper versions when far away.

---

## 4. Nice next upgrades for the look

- **Bloom / glow** via `postprocessing` (EffectComposer + UnrealBloomPass) —
  makes crystals, the unicorn, and windows genuinely glow. Big visual payoff.
- **Textures** on ground/wood/fabric instead of flat colours.
- **Real 3D models** (`.glb`/GLTF) for hero characters, loaded with
  `GLTFLoader`, while keeping instanced primitives for background props.
- **Shader-based water and grass** that move on the GPU.
- **A day/night cycle** driving sky colours + sun position over time.

Any of these is a good "first task" to try with Claude Code (see below).

---

## 5. Put it in the cloud (GitHub)

Hosting your code on GitHub gives you a backup, a full history of every change,
and a place Claude Code and your son can both work from.

**Friendliest path (little/no terminal):**

1. Make a free account at <https://github.com>.
2. Install **GitHub Desktop** (<https://desktop.github.com>) — a visual app.
3. In GitHub Desktop: *File → Add Local Repository →* pick this folder →
   *Publish repository*. That uploads it. (`node_modules` is ignored
   automatically thanks to `.gitignore`.)
4. From then on, GitHub Desktop shows every change; click *Commit* then *Push*
   to save a snapshot to the cloud.

**Terminal path (if you prefer):**

```bash
git init
git add .
git commit -m "Initial world"
# create an empty repo on github.com first, then:
git remote add origin https://github.com/YOUR-NAME/zauberwelt.git
git push -u origin main
```

**Publish it as a live website (free):** the easiest is
[Netlify](https://netlify.com) or [Vercel](https://vercel.com) — connect your
GitHub repo, and they build and host it automatically at a public link you can
share with family. (GitHub Pages also works; because we set `base: './'` in
`vite.config.js`, the build is host-agnostic.)

---

## 6. Build it with Claude Code

[Claude Code](https://docs.claude.com/en/docs/claude-code/overview) is an AI
coding assistant that works directly in this project folder: it reads the code,
makes edits, runs the dev server, and handles Git for you. Perfect for a
non-technical driver who steers with plain-language requests.

**Requirements:** a paid Claude plan (Pro, Max, Team, or Enterprise) or API
credits — the free Claude.ai plan does not include Claude Code.

**Install (two options):**

- **Desktop app (no terminal):** download the Claude desktop app; it can run
  Claude Code with a graphical interface. Easiest for beginners.
- **Command line:** install the CLI, which requires **Node.js 22+**:
  ```bash
  npm install -g @anthropic-ai/claude-code
  claude --version
  ```
  (There is also a native installer that needs no Node.js. See the docs.)

For the current, exact steps see the official setup guide:
<https://docs.claude.com/en/docs/claude-code/overview>

**Use it:** open Claude Code, point it at this folder, and just ask. Examples:

- *"Port the rainbow and the glittery pink unicorn from `legacy/zauberwelt.html`
  into a new file `src/entities/unicorn.js`, following the pattern in
  `character.js`."*
- *"Add bloom/glow using the postprocessing library so the emissive crystals
  really shine."*
- *"Add a day/night button that changes the sky colours and sun position."*
- *"Make the trees also render at half detail when they're far from the camera."*

Claude Code will edit files, install any needed packages, and run `npm run dev`
so you can see the result. When you're happy, tell it to commit and push, or do
it in GitHub Desktop.

---

## 7. Where we are

The **entire prototype has now been ported** into the modular structure. Every
file is small and self-contained, so each thing can be changed without touching
the others. Current modules:

| File | What it is |
|---|---|
| `engine/*` | renderer, scene, camera, lights, loop |
| `state.js` | shared flags (paused, night, labels, follow, autoSpin) |
| `world/sky.js`, `world/dayNight.js` | sky gradient + stars + smooth day/night |
| `world/ground.js` | hilly terrain + shared `heightAt()` |
| `world/instancedForest.js` | 400 trees in 2 draw calls |
| `world/scenery.js` | magic tree, glowing mushrooms, floating crystals |
| `world/mountains.js` | snowy mountains + night-reactive glow mountains |
| `world/skyDecor.js` | sun, moon (+ moonlight), aurora, hot-air balloons |
| `entities/character.js` | base figure: build / walk / seat |
| `entities/family.js` | Papa, Mama, Oma walking |
| `entities/machines.js` | reactor, gears, patrol robot, turbine, island, drones |
| `entities/rainbowUnicorn.js` | rainbow + galloping unicorn that sings along |
| `entities/piano.js` | grand piano, notes rise on the beat |
| `entities/flag.js` | waving flag (vertex animation) |
| `entities/rainPalm.js` | rain + rippling puddle |
| `entities/techHouse.js` | Balthasar + Opa tinkering; finished robot after 60s |
| `entities/pool.js` | water, diving board, jumper (button + click) |
| `entities/gnome.js` | Oberwichtel sunburn loop |
| `entities/magicHouse.js` | button-controlled swinging door |
| `audio/music.js` | melody + sung voice; `onBeat()` for visuals |
| `fx/floatingNotes.js` | rising ♪ used by piano + unicorn |
| `ui/labels.js`, `ui/controls.js` | name/sign labels + the ☰ menu and button bar |
| `ui/splash.js` | when the launch logo (in `index.html`) fades away |
| `ui/mobile.js` | phone-only: "turn your phone" gate + arrow touch pads |

### The menu

The button bar is hidden on every device and opens with the ☰ button. Both the
button and the `menu-open` class it toggles live in `ui/controls.js`; the phone
layer only restyles the bar into a two-column sheet.

### Phone mode

On phones (coarse pointer + short side under 600px) the world asks for
landscape first, then overlays translucent arrow buttons that press the same
keys the keyboard does. Movement (← ↑ ↓ →) and flying (⬆ ⬇) sit together in one
dock at the bottom left, so one thumb works every button while the other hand
drags the view. Everything else — desktop and tablet — is untouched. Append
`?mobile=1` to the URL to preview the phone layout on a desktop browser.

### Performance changes made during the port

The prototype used ~30 point lights. This version uses **3** (sky, sun, moon)
and makes everything else glow with **emissive materials**, and it draws the
whole forest with **instancing**. That is the headroom you build the next 10x
of features into.

### Good next steps

Bloom/glow (postprocessing), textures, real `.glb` character models, and a
timed day/night cycle. Each is a clean single-task request for Claude Code.

Have fun building. 🛠️
