# Kids World

**Explore worlds. Complete missions. Create new adventures.**

Kids World is a lightweight, browser-based 3D exploration game for kids, built with **JavaScript, Three.js, HTML, and CSS**.

Players explore connected worlds, interact with objects, and complete simple missions. Each world has its own environment, activities, and challenges.

**The goal is simple: make it easy for developers to create and connect new worlds.**

**[Play Kids World](https://harboot.github.io/Kids-World/)**

## Worlds & Missions

### Flower Garden — 3 Missions
- Deliver a basket containing at least 3 apples.
- Feed the fish in the pond.
- Greet a cow.

### Wooden House — 5 Missions
- Make the bed.
- Wash the dishes.
- Straighten the painting.
- Turn off the TV.
- Put away the toys.

### Snow Basin — 3 Missions
- Destroy 3 snowmen with snowballs.
- Chop down the large tree.
- Find the Frozen Key.

### Frozen Castle — 3 Missions
- Activate 4 magical ice crystals.
- Build the ice staircase.
- Play the crystal melody.

### Arendelle Village — 3 Missions
- Catch three fish and sell them at the Fish Shop.
- Find and return the lost reindeer.
- Collect three gears and repair the Clock Tower.

## Built for Expansion

Kids World is designed around a reusable game engine and independent world modules.

- **Modular worlds** — Each area owns its environment, missions, and interactions.
- **Shared engine** — Movement, camera, collision, audio, and controls are reusable.
- **Mission progression** — Complete objectives to unlock new worlds.
- **Desktop & mobile** — Keyboard, mouse, and touchscreen controls.
- **Offline-ready PWA** — Install and play without an internet connection after downloading.
- **No complex setup** — Native JavaScript and Three.js, without a backend or large framework.

## Create Your Own World

New worlds live in the `areas/` directory.

To contribute a world:

1. Create a new area module in `areas/`.
2. Build its environment, objects, interactions, and missions.
3. Register the area in `game.js`.
4. Connect it to another world through an interactive doorway.
5. Add tests and update the PWA release manifest.

The shared engine handles rendering, player controls, world transitions, and resource cleanup.

See the [3D geometry guidelines](docs/geometry-guidelines.md) when building a world.

**Focus on creating the adventure — not rebuilding the engine.**

## Run Locally

Requires a modern browser with WebGL 2 support.

Start a local server:

```bash
python3 -m http.server 8000
```

Open **http://localhost:8000**.

Run the tests (Node.js 22 or later):

```bash
node --test
```

## Publishing Updates

After changing game files, regenerate the offline release manifest:

```bash
node scripts/generate-pwa-manifest.mjs
```

Validate the release:

```bash
node scripts/generate-pwa-manifest.mjs --check
```

GitHub Actions checks release metadata and runs automated tests on pull requests.

## Contributing

**Have an idea for a new world? Build it!**

Contributions are welcome, including:

- New exploration worlds.
- Creative missions and interactive objects.
- Animals, characters, and animations.
- Original music and sound effects.
- Gameplay improvements and bug fixes.
- Mobile performance optimizations.

Keep additions lightweight, modular, child-friendly, and compatible with the existing engine.

Open a pull request with a short description of your changes and test results.

---

**Kids World — Every new world brings a new adventure.**
