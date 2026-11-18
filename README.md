# Kids World

Kids World is a first-person exploration game made with HTML, CSS, JavaScript, and Three.js. Follow the path to the ice door at the edge of Flower Garden to visit Snow Basin. The game remembers your last area in this browser and starts there when you reopen it.

- Follow the path beside the apple tree up the hill. You can walk back down the slope or jump from it.
- Take the basket beside the apple tree, shake the tree, and collect the fallen apples. At the cabin, use **Place basket** on the porch table. **Pick up basket** returns it to you with the apples still inside.
- Open the pen gates to greet a cow or make a chicken jump. The animals stay in their pens.
- Cross the fish pond on the wooden bridge, or watch the fish from the bank. The banks and bridge rails keep you clear of the water.
- Walk up the enlarged cabin's steps to the porch bench. While seated, you can look around. Use **Stand up** to move again. The front entrance is closed.

Returning to Flower Garden or using **Restart area** starts a fresh visit. The basket is empty by the apple tree, fallen apples disappear, and the pens, bench, fish, and player return to their starting states. The browser remembers the last area between visits.

| Input | Move | Look | Jump | Interact |
| --- | --- | --- | --- | --- |
| Desktop | W, A, S, D | Arrow keys or click the scene to use the mouse | Space | M or click the circle when the cursor is free |
| Touch | Left joystick | Drag the right side | Tap the scene | Tap the circle near an object |

Press Esc to pause and release the cursor on desktop.

Each area has its own looping music, with sound cues for jumping and interacting. The game generates the audio with the Web Audio API after you select **Explore**. The music-note button mutes all sound and remembers the setting between areas.

## Run locally

Run `python3 -m http.server 8000` from the project directory, then open `http://localhost:8000`. The browser needs WebGL 2 and access to the Three.js CDN.

Run `node --test` with Node.js 22.7 or later to check movement and collision, bridge access, fish paths, basket transitions, area lifecycle and cleanup, and URL routing.

## Architecture

`index.html` hosts one canvas and one set of controls. `game.js` registers the areas and starts the shared lifecycle in `core/game.js`. The core owns the renderer and camera, player movement, input, interaction prompts, and Web Audio. `core/world-manager.js` gives each visit its own scene, camera-mounted viewmodel, collision data, and listener scope.

Area travel replaces the scene and opens the destination's **Explore** menu in the same page. The URL records the area for browser Back and Forward. Opening the site without an area in the URL uses the last visited area. Existing links to `snow.html` and `index.html?arrive=garden` still resolve to their respective areas.

### Add an area

1. Export an area definition from `areas/` and register it under an ID in `game.js`. Include `title`, `heading` (the two parts of the menu title), `description`, `canvasLabel`, `themeColor`, `width`, `depth`, `spawn`, and the `music` preset if the area has music.
2. Implement `load({ THREE, scene, viewmodel, touch, playerRadius, signal })`. Build a fresh scene and return `obstacles` and `interactions`. Supply `getGroundHeight`, `blocksGround`, or `animals` when movement needs them.
3. Add lifecycle hooks as needed. `reset()` runs on entry and **Restart area**, `update(dt, playerPosition)` runs while the player explores, and `unload()` can release resources owned outside the scene. Bind area listeners with `{ signal }`. The manager aborts those listeners, detaches the viewmodel, and disposes the area's scene-owned resources on exit.
4. Define each interaction with `x`, `z`, `label`, and `act(context)`. It can also specify `radius`, `anchorY`, `active`, or `reachable(playerPosition)`. Use `travel(destinationId, heardCue)` from the context when an interaction leads to another area. See `areas/ice-door.js` for the shared door used by both areas.

## GitHub Pages

In **Settings → Pages**, deploy from the `main` branch and the `/ (root)` folder. Relative module paths and area URLs work under the repository's Pages subdirectory.
