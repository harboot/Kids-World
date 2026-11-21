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

### Princess Gallery — 10 Exhibits to Explore
- Glass Walkway — Take the stairs by the Grand Lobby or in the Royal Wing, or use the lift in the Adventure Wing.
- Rapunzel — Jump onto the observation platform to make Rapunzel wave.
- Snow White — Approach Snow White and the seven dwarfs to see them react.
- Cinderella — Approach the glass slipper on the ballroom stairs to make it float and sparkle.
- Aurora — Approach the enchanted rose to wake Aurora. Move away to let her sleep again.
- Ariel — Walk up the shipwreck’s gangplank and stand on deck to see Ariel swim around the wreck. Open and close the treasure chest on the seabed.
- Approach the story displays for Belle, Jasmine, Mulan, Moana, and Tiana to complete the other five missions while their full exhibits are in development.

## Built for Expansion

Kids World is designed around a reusable game engine and independent world modules.

- **Modular worlds** — Each area owns its environment, missions, and interactions.
- **Shared engine** — Movement, camera, collision, audio, and controls are reusable.
- **Mission progression** — Complete objectives to unlock new worlds.
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
node --test
```

### Drone View

Open `?area=garden&view=drone` (or use any registered area ID) and select **Play**. Drag to pan, use the mouse wheel or a two-finger pinch to zoom, and click or tap a surface to select its world coordinates. **Copy Coordinates** copies the selection as `{ x: 12.45, y: 2.10, z: -8.20 }`. Use **Reset View** to restore the overview or **Exit Drone** (Esc) to resume play. After exiting, use **Drone View** in the pause menu to inspect the same visit again.

### Frame-time overlay

Open `?area=princess-gallery&view=fps` and select **Play**. The overlay updates about once per second with the P95 time between rendered frames over the last five seconds and its equivalent FPS. A P95 of 33.3 ms means that 95% of sampled frame intervals were at most 33.3 ms, equivalent to a cadence of about 30 FPS. Pausing, hiding the tab, or switching areas starts a fresh sample window when play resumes.

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
