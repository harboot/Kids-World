# Dustline

Dustline is a browser-based 3D target range built with HTML, CSS, JavaScript, and Three.js. Clear each group of targets and hit 10 to record your completion time. A cow and two chickens wander around the arena as scenery.

| Input | Move | Aim | Fire | Jump |
| --- | --- | --- | --- | --- |
| Desktop | W, A, S, D | Mouse or arrow keys | Left click or Space | — |
| Touch | Up, left, and right on the D-pad | Drag on the right side | Tap the arena | Down on the D-pad |

Desktop play uses Pointer Lock. Press Esc to pause and release the cursor. Touch play works best in landscape. The timer counts active play time and pauses with the game.

## Run locally

Run `python3 -m http.server 8000` from the project directory, then open `http://localhost:8000`. The browser needs WebGL 2 and access to the Three.js CDN.

## GitHub Pages

In the repository's **Settings → Pages**, deploy from the `main` branch and the `/ (root)` folder. GitHub Pages serves the static files directly.
