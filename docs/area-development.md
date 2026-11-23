# Area development

## Create and test an area

1. Create an area folder under `areas/`. Export a static `metadata` object from `metadata.js` with the stable area ID and the fields below. Keep this module free of scene, mission, and audio imports.
2. Default-export a definition from `index.js` that spreads `metadata` and supplies `load(context)`. The engine imports the module asynchronously, then calls `load` synchronously to build the scene and return the visit.
3. Use the metadata ID as the registry key in `game.js`. Read its metadata from `areaMetadata['<id>']` and declare `loadModule: () => import('./areas/<folder>/index.js')` with a literal path. Use `publicArea(metadata, folder, loadModule)` to register a public area and its thumbnail.
4. Save the area thumbnail as a 480 × 270 JPEG of at most 25 KB (25,000 bytes), named after its folder, such as `areas/princess-gallery/princess-gallery.jpg`. Public areas require a thumbnail.
5. Open `?area=<id>` locally and add `&view=drone` to inspect surfaces. Add regression tests for routing, reset, and mission completion.
6. Regenerate the area statistics and PWA manifest, then validate the release.

```sh
npm ci
node scripts/generate-area-stats.mjs
node scripts/generate-pwa-manifest.mjs
node scripts/generate-pwa-manifest.mjs --check
node --test
```

`show: true` makes an area visible in the picker and eligible for public completion badges. Its files are precached in every release. `show: false` makes it link-only, such as `?area=secret-apartment`. Hidden files are verified and cached as they are requested. Open a hidden area online before visiting it offline. The release generator builds `area-catalog.js` from the area metadata sources.

Use literal relative JavaScript imports and `new URL('./asset.ext', import.meta.url)` for area assets. The release generator checks transitive dependencies, including imports across area folders. Files needed by a public area are precached even when a hidden area also uses them.

## Area metadata

| Required field | What it supplies |
| --- | --- |
| `id` | Stable ID matching the registry key used for routing and completion records |
| `title`, `description`, `canvasLabel`, `themeColor` | Nonempty strings for the wordmark, menu, accessible canvas name, and browser theme color |
| `heading` | Two strings for the menu heading and its accent, with visible text in at least one |
| `width`, `depth` | Positive finite dimensions of the area in world units |
| `missionCount` | Number of mission rows shown in the area HUD and on Area Statistics |
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
- See the visit lifecycle below for `reset()`, `update(dt, player, elapsed)`, `unload()`, and resource ownership.
- Optional `getGroundHeight(x, z, feet)`, `blocksGround(x, z, radius, feet, from)`, and `getCeilingHeight(x, z)` support slopes, elevated surfaces, and specialized collision. The default terrain is flat at zero.
- Optional `droneView` overrides the default fit with `{ center: { x, z }, width, depth }`. A getter can return different bounds when the active zone changes, as in Secret Apartment.

### Visit lifecycle and ownership

- `load(context)` builds a visit synchronously. Attach models to `scene` and first-person props to `viewmodel` as they are created. Keep the shared player camera and other visits untouched during construction. Core prepares one candidate scene while holding the previous scene so a failed build can return the player to their working visit.
- `update(dt, player, elapsed)` runs for the active visit during gameplay. `player` is the eye position. Use `dt` for movement and collision. It is capped at 50 ms. `elapsed` is capped at 250 ms for animations that can tolerate a larger frame step. The first frame after resuming starts with zero elapsed time.
- `reset()` runs once after construction and again on restart. Restore the visit's mutable state, stop animations or timers from the previous attempt, and clear any temporary interaction state. The same visit signal stays valid across resets, so keep attempt-specific work separately cancellable.
- Use the visit's `signal` with `addEventListener` and cancellable async APIs. Check `signal.aborted` after an `await` before touching the visit. Use `onCleanup(fn)` immediately when creating a temporary overlay, timer, animation callback, or other resource outside the scene. Core runs registered cleanup even when `load` or initial `reset` throws.
- `unload()` is called once for a visit that returned from `load`, after its signal is aborted. Use it to stop visit-specific work. Keep independent cleanup steps in separate `onCleanup` callbacks so they can still run if another throws.
- Core disposes scene and viewmodel geometries, materials, textures, instancing resources, and attached shadow or render targets. It preserves instances still referenced by the surviving visit or persistent camera. Use `onCleanup` to dispose resources Core cannot reach, such as a detached render target, and release those only when you own them.

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

Add this registry entry to `game.js`, regenerate the release, then open `?area=example-yard`.

```js
'example-yard': {
  ...areaMetadata['example-yard'],
  show: false,
  loadModule: () => import('./areas/example-yard/index.js'),
},
```

## Shared tools and ownership

The engine provides the renderer, cameras, movement, input, generic interactions, URL routing, scene cleanup, drone controls, and the Mission HUD. An area supplies its environment, mission state, and gameplay. The HUD formats the progress and starts closed on a new or restarted visit.

- `load(context)` supplies `THREE`, `scene`, `viewmodel`, and the real player `camera`, along with `touch`, `playerRadius`, `signal`, and `onCleanup`.
- An interaction can call `guideCamera(look?)` for a guided ride. Core pauses walking, jumping, and interaction prompts and routes look deltas to the optional callback. The area poses the camera during its update and calls the returned function with a safe standing spawn when the ride ends. Core clears the camera lock on restart and travel.
- For a moving platform, call `carryPlayer(deltaY)` from the area update while the player is aboard. Keep the platform’s ground and ceiling queries in sync with its position.
- Use `isPlayerGrounded()` for interactions that require the player to stand on a surface. The position passed to `update()` is the player's eye position. Subtract `EYE_HEIGHT` from `core/player.js` to find the foot height.
- Call `notify(message)` for short feedback from gameplay events. Core handles replacement, timing, and cleanup. Use `playCue(notes)` for distinctive area sounds, and use `completeLevel(id)` and `isLevelComplete(id)` for public area completion records.
- For a specialized button or cinematic, attach its DOM to the supplied `hud`, use `isPlaying()` for gameplay input, honor `reducedMotion()` for effects, and register its removal with `onCleanup`. Snow Basin's throw button and Secret Apartment's overlays are examples.
- `core/geometry.js` provides `rectangleBounds` for centered XZ footprints, `addGroup` and `addMesh` for local placement, and `paintCanvasTexture` for painted sRGB textures. Use `SURFACE_GAP` with the project’s geometry guidance for overlapping detail. [3D geometry guidelines](geometry-guidelines.md)
- `core/random.js` provides `seededRandom(seed)` for deterministic scenery. For overhead geometry that should appear only in normal play, use `PLAYER_ONLY_LAYER` from `core/render-layers.js`. Reusable in-world content lives in `areas/shared/`.
