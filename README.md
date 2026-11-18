# Kids World

Kids World is a first-person exploration game made with HTML, CSS, JavaScript, and Three.js. Follow the path to the ice door at the edge of Flower Garden to visit Snow Basin. The game remembers your last area in this browser and starts there when you reopen it.

- Take the basket beside the apple tree, shake the tree, and collect the fallen apples. You can keep collecting after the basket looks full.
- Open the pen gates to greet a cow or make a chicken jump. The animals stay in their pens.
- Walk up the wooden cabin steps to the porch bench. While seated, you can look around. Use **Stand up** to move again.

| Input | Move | Look | Jump | Interact |
| --- | --- | --- | --- | --- |
| Desktop | W, A, S, D | Arrow keys | Space | M or click the circle near an object |
| Touch | Left joystick | Drag the right side | Tap the scene | Tap the circle near an object |

Press Esc to pause on desktop.

Each area has its own looping music, with sound cues for jumping and interacting. The game generates the audio with the Web Audio API after you select **Explore**. The music-note button mutes all sound and remembers the setting between areas.

## Run locally

Run `python3 -m http.server 8000` from the project directory, then open `http://localhost:8000`. The browser needs WebGL 2 and access to the Three.js CDN.

## GitHub Pages

In **Settings → Pages**, deploy from the `main` branch and the `/ (root)` folder. Both areas use relative links and load as separate static pages.
