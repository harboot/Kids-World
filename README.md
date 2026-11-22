# Kids World

**Explore worlds. Complete missions. Create new adventures.**

Kids World is a lightweight, browser-based 3D exploration game for kids, built with **JavaScript, Three.js, HTML, and CSS**.

Players explore worlds, interact with objects, and complete simple missions. Open **Choose area** to visit any public world and see which areas have all their missions complete.

**The goal is simple: make it easy for developers to create new worlds.**

**[Play Kids World](https://harboot.github.io/Kids-World/)**

[Area Statistics](https://harboot.github.io/Kids-World/stats.html) lists map dimensions and repository file statistics for every registered area.

## Worlds & Missions

### Flower Garden — 5 Missions
- Deliver a basket containing at least 3 apples.
- Feed the fish in the pond.
- Greet a cow in its pen.
- Pick carrots at the foot of the hill and put them in the tray to feed all five rabbits.
- Open the chicken pen and make a chicken jump.

Ride the hot air balloon for a view of the lakes and forests, or walk through the mountain cave and watch for bats at either entrance.

### Wooden House — 5 Missions
- Make the bed.
- Wash the dishes.
- Straighten the painting.
- Turn off the TV.
- Put away the toys.

### Snow Basin — 4 Missions
- Chop down the pine in 5 chops.
- Destroy 3 snowmen from the western snowball station.
- Climb Ice Mountain and ride the ice slide.
- Meet Olaf by the frozen lake.

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
- Belle — Visit Belle and the Beast in the castle library and approach the tea table to see the teapot and cups dance.
- Approach the story displays for Jasmine, Mulan, Moana, and Tiana to complete the other four missions while their full exhibits are in development.

### Military Base — 5 Missions

- Security Patrol — Activate the panels at South Gate, Motor Pool, and South Lookout.
- Repair the Tank — Collect and install three components, then stand clear while the tank parks.
- Supply Delivery — Carry three crates from the Supply Depot to the Field Hospital, one at a time.
- Radar Activation — Inspect the radar console and align the dish, rotating array, and west relay.
- Helicopter Patrol — Board at the right passenger door for an automatic clockwise sightseeing flight. You can look around during the ride and board again after landing.

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

GitHub Actions checks release metadata and runs automated tests on pull requests.

Area statistics count regular files under each registered area's folder and its entry module. JavaScript LOC counts physical lines, including blank lines and comments. The generator reads declared dimensions from literals and named constants. Unresolved dimensions appear as a dash in the dashboard.

On pushes to `main`, the area statistics workflow regenerates the dashboard data and PWA release, commits changed outputs, and deploys that validated snapshot in the same run. Set the publishing source in **Settings → Pages → Build and deployment** to **GitHub Actions** when adopting this workflow so it is the sole publisher. If GitHub rejects a generated commit, the workflow reports the failure and stops before deployment.

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
