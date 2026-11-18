# Kids World

Kids World is a first-person exploration game made with HTML, CSS, JavaScript, and Three.js. In Flower Garden, open the wooden pen gates to visit the cows and chickens. The animals stay inside their pens even when the gates are open. The teal door at the end of the path loads Snow Basin, an 18 × 20 area with a frozen pond and a door back to the garden.

| Input | Move | Look | Jump | Interact |
| --- | --- | --- | --- | --- |
| Desktop | W, A, S, D | Mouse or arrow keys | Space | M near an object |
| Touch | Left joystick | Drag the right side | Tap the scene | Tap the circle near an object |

Desktop mouse look uses Pointer Lock. Press Esc to pause and release the cursor.

Each area has its own looping music, with sound cues for jumping and interacting. The game generates the audio with the Web Audio API after you select **Explore**. The music-note button mutes all sound and remembers the setting between areas.

## Run locally

Run `python3 -m http.server 8000` from the project directory, then open `http://localhost:8000`. The browser needs WebGL 2 and access to the Three.js CDN.

## GitHub Pages

In **Settings → Pages**, deploy from the `main` branch and the `/ (root)` folder. Both areas use relative links and load as separate static pages.
