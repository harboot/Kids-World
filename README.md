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
| Desktop | W, A, S, D | Arrow keys | Space | M or click the circle near an object |
| Touch | Left joystick | Drag the right side | Tap the scene | Tap the circle near an object |

Press Esc to pause on desktop.

Each area has its own looping music, with sound cues for jumping and interacting. The game generates the audio with the Web Audio API after you select **Explore**. The music-note button mutes all sound and remembers the setting between areas.

## Run locally

Run `python3 -m http.server 8000` from the project directory, then open `http://localhost:8000`. The browser needs WebGL 2 and access to the Three.js CDN.

Run `node --test tests/garden.test.mjs` with Node.js 22.7 or later to check terrain sampling, elevation and collision, bridge access, fish paths, and basket transitions.

## GitHub Pages

In **Settings → Pages**, deploy from the `main` branch and the `/ (root)` folder. Both areas use relative links and load as separate static pages.
