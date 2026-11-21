# Area development

## Create and test an area

1. Create an area folder under `areas/`. Export a static `metadata` object from `metadata.js` with the stable area ID and the fields below. Keep this module free of scene, mission, and audio imports.
2. Default-export a definition from `index.js` that spreads `metadata` and supplies `load(context)`. The engine imports the module asynchronously, then calls `load` synchronously to build the scene and return the visit.
3. Import the metadata in `game.js`. Use the metadata ID as the registry key and declare `loadModule: () => import('./areas/<folder>/index.js')` with a literal path. Use `publicArea(metadata, folder, loadModule)` to register a public area and its thumbnail.
4. For a public area, add a 16:9 JPEG named after the folder, such as `areas/princess-gallery/princess-gallery.jpg`.
5. Open `?area=<id>` locally and add `&view=drone` to inspect surfaces. Add regression tests for routing, reset, and mission completion.
6. Regenerate the area statistics and PWA manifest, then validate the release.

```sh
node scripts/generate-area-stats.mjs
node scripts/generate-pwa-manifest.mjs
node scripts/generate-pwa-manifest.mjs --check
node --test
```

`show: true` makes an area visible in the picker and eligible for public completion badges. `show: false` makes it link-only, such as `?area=secret-apartment`. Both use the same lazy loader and remain in the PWA precache until Phase 2, so every area can still open offline from a complete release.

## Area metadata

| Required field | What it supplies |
| --- | --- |
| `id` | Stable ID matching the registry key used for routing and completion records |
| `title`, `description`, `canvasLabel`, `themeColor` | Nonempty strings for the wordmark, menu, accessible canvas name, and browser theme color |
| `heading` | Two strings for the menu heading and its accent, with visible text in at least one |
| `width`, `depth` | Positive finite dimensions of the area in world units |
| `spawn` | Finite `x` and `z` coordinates, with optional finite `yaw` in radians and `elevation` for selecting an elevated surface |

`loadingMessage` can override the default loading text. Set or increment the positive integer `completionRevision` when a changed mission list requires a new completion badge.

### Background music

Export the area's original score as `music` from its own `music.js` and pass that object in the area definition. The audio engine renders and caches the loop on demand after audio unlock.

- `beat` is seconds per beat. `beatsPerBar` defaults to four.
- Each bar contains a `chord` of MIDI pitches and a `melody` of `[beatOffset, midiPitch]` pairs.
- Optional `accompaniment` parts select zero-based chord `voices`. Use `offset` for the first onset and `spread` for the interval between voices, both in beats.
- Optional `melody` parts play each bar's melody, and optional `rhythm` parts repeat their own `notes` pairs in each bar. Parts can specify an `offset` in beats and a `transpose` in semitones.
- Each part sets a `duration` in beats and a gain `level`. Optional `attack` and `delay` are in seconds, `wave` defaults to `'sine'`, and `endPitch` bends the oscillator toward a MIDI pitch. See `areas/arendelle-village/music.js` for a compact example.

### Loaded visit

- `obstacles` is required and can be an empty array. An ordinary obstacle has `left`, `right`, `front`, `back`, and a top `height` in world units.
- `missionStatus` is required. Return `{ missions, hint?, inventory? }` with an array of `{ id, title, current, total, complete }` rows. Use unique stable IDs, a positive integer total, and integer progress from zero to the total. `complete` is a separate boolean, so a full counter can still require a delivery or sale. Use one contextual hint and an optional array of inventory item names. An area without missions can return `{ missions: [] }`.
- `interactions` is optional. Each item needs `x` and `z` in world space, a `label`, and `act(context)`. Optional fields include `active`, `radius`, `anchorY`, `requiresView`, `reachable(position)`, and `silent`. The action context provides `relocate(spawn)` and `sit(pose, standLabel)`.
- `reset()` is called after load and on restart if supplied. Reset mutable area and mission state here. Optional `update(dt, player, elapsed)` receives elapsed seconds, with `dt` capped for simulation. Optional `unload()` cleans up area-owned resources outside the scene.
- Optional `getGroundHeight(x, z, feet)`, `blocksGround(x, z, radius, feet, from)`, and `getCeilingHeight(x, z)` support slopes, elevated surfaces, and specialized collision. The default terrain is flat at zero.
- Optional `droneView` overrides the default fit with `{ center: { x, z }, width, depth }`. A getter can return different bounds when the active zone changes, as in Secret Apartment.

## Minimal example

Save the metadata as `areas/example-yard/metadata.js`.

```js
export const metadata = {
  id: 'example-yard',
  title: 'Bell Yard',
  heading: ['Bell', 'Yard'],
  description: 'Walk up to the bell and ring it.',
  canvasLabel: '3D yard with a bell',
  themeColor: '#e9eedc',
  width: 12,
  depth: 12,
  spawn: { x: 0, z: 3 },
};
```

Save the implementation as `areas/example-yard/index.js`.

```js
import { addMesh, rectangleBounds } from '../../core/geometry.js';
import { metadata } from './metadata.js';

export default {
  ...metadata,
  load({ THREE, scene, notify }) {
    scene.background = new THREE.Color(0xd9edf0);
    scene.add(new THREE.HemisphereLight(0xfff8e6, 0x647d54, 2));
    addMesh(THREE, scene, new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshLambertMaterial({ color: 0x89b470 }), 0, -0.1, 0, 12, 0.2, 12);
    const bell = addMesh(THREE, scene, new THREE.SphereGeometry(0.45),
      new THREE.MeshLambertMaterial({ color: 0xc48936 }), 0, 0.5, -2, 1, 1, 1);
    let rang = false;
    return {
      obstacles: [{ ...rectangleBounds(bell.position.x, bell.position.z, 0.9, 0.9), height: 0.95 }],
      interactions: [{
        x: bell.position.x,
        z: bell.position.z,
        label: 'Ring the bell',
        get active() { return !rang; },
        act() {
          if (rang) return;
          rang = true;
          notify('The bell rang!');
        },
      }],
      get missionStatus() {
        return {
          missions: [{ id: 'bell', title: 'Ring the bell', current: Number(rang), total: 1, complete: rang }],
          hint: rang ? '' : 'Walk up to the bell and interact.',
        };
      },
      reset() { rang = false; },
    };
  },
};
```

Import `{ metadata as exampleYard }` from `./areas/example-yard/metadata.js` in `game.js`. Add this registry entry and open `?area=example-yard`.

```js
'example-yard': {
  ...exampleYard,
  show: false,
  loadModule: () => import('./areas/example-yard/index.js'),
},
```

## Shared tools and ownership

The engine provides the renderer, cameras, movement, input, generic interactions, URL routing, scene cleanup, drone controls, and the Mission HUD. An area supplies its environment, mission state, and gameplay. The HUD formats the progress and starts closed on a new or restarted visit.

- `load(context)` supplies `THREE`, `scene`, `viewmodel`, and the real player `camera`, along with `touch`, `playerRadius`, and the visit's `signal`. Attach scene objects to `scene` or first-person props to `viewmodel` so Core can dispose of their geometries, materials, and textures. Use `{ signal }` for visit-specific listeners.
- An interaction can call `guideCamera(look?)` for a guided ride. Core pauses walking, jumping, and interaction prompts and routes look deltas to the optional callback. The area poses the camera during its update and calls the returned function with a safe standing spawn when the ride ends. Core clears the camera lock on restart and travel.
- For a moving platform, call `carryPlayer(deltaY)` from the area update while the player is aboard. Keep the platform’s ground and ceiling queries in sync with its position.
- Use `isPlayerGrounded()` for interactions that require the player to stand on a surface. The position passed to `update()` is the player's eye position. Subtract `EYE_HEIGHT` from `core/player.js` to find the foot height.
- Call `notify(message)` for short feedback from gameplay events. Core handles replacement, timing, and cleanup. Use `playCue(notes)` for distinctive area sounds, and use `completeLevel(id)` and `isLevelComplete(id)` for public area completion records.
- For a specialized button or cinematic, attach its DOM to the supplied `hud`, use `isPlaying()` for gameplay input, honor `reducedMotion()` for effects, and remove the custom UI in `unload()`. Snow Basin's throw button and Secret Apartment's overlays are examples.
- `core/geometry.js` provides `rectangleBounds` for centered XZ footprints, `addGroup` and `addMesh` for local placement, and `paintCanvasTexture` for painted sRGB textures. Use `SURFACE_GAP` with the project’s geometry guidance for overlapping detail. [3D geometry guidelines](geometry-guidelines.md)
- `core/random.js` provides `seededRandom(seed)` for deterministic scenery. For overhead geometry that should appear only in normal play, use `PLAYER_ONLY_LAYER` from `core/render-layers.js`. Reusable in-world content lives in `areas/shared/`.
