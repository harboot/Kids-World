# Kids World

Kids World is a first-person exploration game made with HTML, CSS, JavaScript, and Three.js. Deliver a basket with five apples to the Flower Garden cabin to reveal the ice door to Snow Basin. The game remembers your last area and which levels you have completed in this browser.

The hint below the area name shows what to do next and tracks progress during play. On replay, hints start at the first step even if a door is already unlocked. A door sparkles briefly when you first unlock it.

- Follow the path beside the apple tree up the hill. You can walk back down the slope or jump from it.
- Take the basket beside the apple tree, shake the tree, and collect the fallen apples. At the cabin, use **Place basket** on the porch table. **Pick up basket** returns it to you with the apples still inside.
- Open the pen gates to greet a cow or make a chicken jump. The animals stay in their pens.
- Cross the fish pond on the wooden bridge, or watch the fish from the bank. The banks and bridge rails keep you clear of the water.
- Walk up the cabin steps to the porch bench or front door. While seated, you can look around. Use **Stand up** to move again.

Returning to Flower Garden or using **Restart area** starts a fresh visit. The basket is empty by the apple tree, fallen apples disappear, and the pens, bench, fish, and player return to their starting states. The browser remembers the last area between visits.

## Wooden House

Walk onto the Flower Garden cabin porch and use **Enter Wooden House** at the front door. The house is open from your first visit to the garden. In its one large room, **Make bed**, **Wash dishes**, **Straighten painting**, **Turn off TV**, and **Put away toys** in any order. Press **M** or tap the nearby interaction button. The hint tracks each completed task, and finishing all five saves the level and celebrates with stars.

Use **Return to Flower Garden** at the inside door to reappear by the cabin steps. Every visit starts with a messy house, including **Restart area** and replaying through **Choose level**. Saved completion stays available. Wooden House also works offline after downloading the current release, including from `index.html?area=wooden-house`.

## Snow Basin

Pick up the axe by the frozen pond. Approach the marked side of the tall pine and use **Chop tree** five times. After the pine lands, five snowmen appear in different spots within the basin. Use **Make snowball** at a snow pile, aim, and throw. Each snowman breaks into snow on the first hit. You can return to any pile for another snowball.

The original ice door returns to Flower Garden. Clearing all five snowmen reveals the **Frozen Castle** entrance, which displays a coming-soon message.

Use **Choose level** in the top-right corner to replay a completed level. Play activities start fresh when revisiting a level or using **Restart area** in the level picker. Previously opened doors stay available.

| Input | Move | Look | Jump | Interact | Throw in Snow Basin |
| --- | --- | --- | --- | --- | --- |
| Desktop | W, A, S, D | Arrow keys or click the scene to use the mouse | Space | M or click the circle when the cursor is free | F |
| Touch | Left joystick | Drag the right side | Tap the scene | Tap the circle near an object | **Throw** button |

Press Esc to pause and release the cursor on desktop.

Each area has its own looping music, with sound cues for jumping and interacting. The game generates the audio with the Web Audio API after you select **Explore**. The music-note button mutes all sound and remembers the setting between areas.

## Run locally

Run `python3 -m http.server 8000` from the project directory, then open `http://localhost:8000`. The browser needs WebGL 2. Three.js r179 (0.179.1) is served from `vendor/`, with its MIT license.

Run `node --test` with Node.js 22.7 or later. It checks movement and collision, bridge access, fish paths, basket transitions, area lifecycle and cleanup, routing, release metadata, download integrity, and fallback behavior.

## Architecture

`index.html` hosts one canvas and one set of controls. `game.js` registers the areas and starts the shared lifecycle in `core/game.js`. The core owns the renderer and camera, player movement, input, interaction prompts, and Web Audio. `core/world-manager.js` gives each visit its own scene, camera-mounted viewmodel, collision data, and listener scope.

`areas/snow-basin.js` composes the area and owns its controls and progress display. `areas/snow-basin/scenery.js` builds the landscape, `props.js` builds the winter activity models, and `activity.js` handles the chop sequence, snowman placement, and swept projectile collision. An area can use the shared `camera`, `hud`, `isPlaying()`, and `playCue(notes)` capabilities during its visit. It can set `silent: true` on an interaction that plays its own cue.

Area travel replaces the scene and opens the destination's **Explore** menu in the same page. The URL records the area for browser Back and Forward. Opening the site without an area in the URL uses the last visited area. Existing links to `snow.html` and `index.html?arrive=garden` still resolve to their respective areas.

### Add an area

1. Export an area definition from `areas/` and register it under an ID in `game.js`. Include `title`, `heading` (the two parts of the menu title), `description`, `canvasLabel`, `themeColor`, `width`, `depth`, `spawn`, and the `music` preset if the area has music.
2. Implement `load({ THREE, scene, viewmodel, touch, playerRadius, signal })`. Build a fresh scene and return `obstacles` and `interactions`. Supply `getGroundHeight`, `blocksGround`, or `animals` when movement needs them.
3. Add lifecycle hooks as needed. `reset()` runs on entry and **Restart area**, `update(dt, playerPosition)` runs while the player explores, and `unload()` can release resources owned outside the scene. Bind area listeners with `{ signal }`. The manager aborts those listeners, detaches the viewmodel, and disposes the area's scene-owned resources on exit.
4. Define each interaction with `x`, `z`, `label`, and `act(context)`. It can also specify `radius`, `anchorY`, `active`, or `reachable(playerPosition)`. Use `travel(destinationId, heardCue)` from the context to change areas. An optional third argument selects a named spawn from the destination's `arrivals`.

## Installation and offline play

Open Kids World online once and wait for **Play**. The progress bar counts files after they have been verified and stored. Use the browser's install or **Add to Home Screen** command to open Kids World as a standalone app. After the complete download, all three areas work offline, including area travel, audio, the saved area, and mute.

To test offline locally, finish the first download, enable **Offline** in the browser's Network panel, and reload. Try `index.html?area=snow` directly and use both ice doors. To test failure on a first download, use a fresh browser profile, interrupt the download, and look for **Try again**. To test updates, serve a second generated release from the same address and open a fresh tab. An existing game can keep running. When returning to it after five minutes, the game checks again and offers a reload if a newer release is ready.

### Physical-device checklist

On Android Chrome and iOS Safari, open the GitHub Pages link and wait for **Play**. Install it or add it to the Home Screen, then launch it from the icon. In portrait and landscape, use the joystick and drag to look at the same time. Test jump, tap interactions, audio, and fullscreen where available. Close the app, turn on airplane mode, and reopen from the icon. Cross both ice doors and check that the saved area and mute setting survive reopening.

### PWA architecture

`index.html` contains the splash and the game markup. `pwa/bootstrap.js` asks the service worker for a complete release before importing the game. The worker checks `version.json` from the network with a deadline. It verifies each file's SHA-256 hash and writes a completion marker only after every file is available. A new release has its own staging cache and can reuse verified files with matching hashes. An interrupted or invalid release leaves the last complete release available offline.

Each game session requests its shell assets and modules through versioned service-worker URLs. A published release can be downloaded in another tab while the running session keeps its files and renderer. The worker leaves other sessions' caches in place while multiple windows are open. During a single-window startup, it keeps the selected release and the two most recently completed releases. Cache names include the app's scope. The browser activates worker code updates when it can release the old worker's clients.

### Publish a release

1. Add area code and area-specific assets under `areas/`. Shared assets go under `assets/`, and runtime modules go under `core/` or `pwa/`. The generator scans those directories and `vendor/` recursively. It skips hidden files, documentation, test directories, test modules, and source maps.
2. Run `node scripts/generate-pwa-manifest.mjs` and `node --test`. Commit the changes with the generated `version.json` and `sw.js`, then open a pull request.
3. The **Validate release** GitHub Actions workflow runs `node scripts/generate-pwa-manifest.mjs --check` and `node --test` on pull requests to `main` and pushes to `main`. It fails if either generated file is stale. After the PR passes and merges, GitHub Pages publishes the new release.

The release ID comes from the manifest's file hashes. The generated `sw.js` entry point changes with that ID so browsers detect a worker update even when its logic stays the same.

`version.json` and the generated `sw.js` entry point are published metadata. The manifest hashes the runtime payload, including the worker implementation, without hashing the generated metadata into itself.

### Troubleshooting

- If the first download fails, reconnect and select **Try again**. The browser console identifies failed requests, hash mismatches, and storage errors. When Service Worker registration or cache storage is unavailable, a fresh network page can open the game online. A cached page keeps using its own release.
- If an update fails, the app uses the saved complete release. Check that Pages published `version.json`, `sw.js`, and their matching runtime files from one commit.
- Offline play requires a completed download in the same browser profile and site. Browsers can evict cached files when storage is low. Reconnect to repair the download. Browsers without Service Worker support can play online.

## GitHub Pages

In **Settings → Pages**, deploy from the `main` branch and the `/ (root)` folder. Keep the site on HTTPS for installation and offline play. The relative start URL, Service Worker scope, and file URLs work under `/Kids-World/` or at a custom domain root. `localhost` works for local testing.

Recommended repository description: “Kids World — A kid-friendly 3D browser exploration game with interactive worlds, animals, and activities.”
