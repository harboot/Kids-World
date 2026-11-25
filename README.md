# Kids World

**Explore worlds. Complete missions. Create new adventures.**

Kids World is a lightweight, browser-based 3D exploration game for kids, built with **JavaScript, Three.js, HTML, and CSS**.

Players explore worlds, interact with objects, and complete simple missions. Open **Choose area** to visit any public world and see which areas have all their missions complete.

**The goal is simple: make it easy for developers to create new worlds.**

**[Play Kids World](https://harboot.github.io/Kids-World/)**

[Area Statistics](https://harboot.github.io/Kids-World/stats.html) lists map dimensions and repository file statistics for every registered area.

## Built for Expansion

Kids World is designed around a reusable game engine and independent world modules.

- **Modular worlds** — Each area owns its environment, missions, and interactions.
- **Shared engine** — Movement, camera, collision, audio, and controls are reusable.
- **Mission progress** — Complete objectives in each world and see your progress in the area picker.
- **Desktop & mobile** — Keyboard, mouse, and touchscreen controls.
- **Offline-ready PWA** — Install and play without an internet connection after downloading.
- **No complex setup** — Native JavaScript and Three.js, without a backend or large framework.

## Create Your Own World

Build a world in `areas/` and register it in `game.js`. The guide includes a working example, the mission and interaction contracts, and the release checklist. [Area development guide](docs/area-development.md)

## Run Locally

Requires a modern browser with WebGL 2 support.

Start a local server:

```bash
python3 -m http.server 8000
```

Open **http://localhost:8000**.

Run the tests (Node.js 22 or later):

```bash
npm ci
node --test
```

### Drone View

Open `?area=garden&view=drone` (or use any registered area ID) and select **Play**. Drag to pan, use the mouse wheel or a two-finger pinch to zoom, and click or tap a surface to select its world coordinates. **Copy Coordinates** copies the selection as `{ x: 12.45, y: 2.10, z: -8.20 }`. Use **Reset View** to restore the overview or **Exit Drone** (Esc) to resume play. After exiting, use **Drone View** in the pause menu to inspect the same visit again.

### Frame-time overlay

Open `?area=princess-gallery&view=fps` and select **Play**. The overlay updates about once per second with the P95 time between rendered frames over the last five seconds and its equivalent FPS. A P95 of 33.3 ms means that 95% of sampled frame intervals were at most 33.3 ms, equivalent to a cadence of about 30 FPS. Pausing, hiding the tab, or switching areas starts a fresh sample window when play resumes.

## Publishing Updates

To preview the current area inventory and refresh the offline release manifest locally, run:

```bash
npm ci
node scripts/generate-area-stats.mjs
node scripts/generate-pwa-manifest.mjs
```

Validate the release:

```bash
node scripts/generate-pwa-manifest.mjs --check
```

Run the full automated test suite locally before merging a pull request; GitHub Actions handles release metadata and deployment.

Area statistics count regular files under each registered area's folder and its entry module. JavaScript LOC counts physical lines, including blank lines and comments. The generator reads declared dimensions from literals and named constants. Unresolved dimensions appear as a dash in the dashboard.

On pushes to `main`, the area statistics workflow regenerates the dashboard data and PWA release, commits changed outputs, and deploys that validated snapshot in the same run. Set the publishing source in **Settings → Pages → Build and deployment** to **GitHub Actions** when adopting this workflow so it is the sole publisher. If GitHub rejects a generated commit, the workflow reports the failure and stops before deployment.

## Contributing

Everyone is welcome to fork Kids World, experiment with the game, and build their own version.

Upstream contributions are limited to:

- **New areas** — Submit a complete, playable area with its environment, objects, and meaningful interactions. Include missions where appropriate, rather than submitting isolated props or unfinished scenes.
- **Existing areas** — Improve or fix an existing area's environment, objects, characters, animations, missions, or interactions.

Keep changes area-local, modular, child-friendly, and compatible with the existing engine. Follow the [area development guide](docs/area-development.md) and [geometry guidelines](docs/geometry-guidelines.md). Open a pull request describing the area changes and include test results.

---

**Kids World — Every new world brings a new adventure.**

## Worlds & Missions

**8 public areas · 48 total missions**

| World | Missions | Highlights |
| --- | ---: | --- |
| [Flower Garden](https://harboot.github.io/Kids-World/?area=garden) | 12 | Deliver apples, help garden animals, explore the pond, cave and balloon. |
| [Wooden House](https://harboot.github.io/Kids-World/?area=wooden-house) | 11 | Help the family, tidy the rooms, wash dishes and put away toys. |
| [Snow Basin](https://harboot.github.io/Kids-World/?area=snow) | 4 | Chop a pine, hit snowmen, ride the ice slide and meet Olaf. |
| [Frozen Castle](https://harboot.github.io/Kids-World/?area=frozen-castle) | 3 | Activate ice crystals, build an ice staircase and play a melody. |
| [Arendelle Village](https://harboot.github.io/Kids-World/?area=arendelle-village) | 3 | Catch and sell fish, return the lost reindeer and repair the clock tower. |
| [Princess Gallery](https://harboot.github.io/Kids-World/?area=princess-gallery) | 10 | Explore fairy-tale exhibits, meet characters and discover interactive scenes. |
| [Military Base](https://harboot.github.io/Kids-World/?area=military-base) | 5 | Patrol, repair a tank, deliver supplies, activate radar and ride a helicopter. |
| [Kung Fu Hustle](https://harboot.github.io/Kids-World/?area=kung-fu-hustle) | 0 | Explore the tenement, meet its residents and discover the Buddha Palm interaction. |

Areas without formal missions offer free exploration and interactive activities. See [Area Statistics](https://harboot.github.io/Kids-World/stats.html) for the current area inventory.
