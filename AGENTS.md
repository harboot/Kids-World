# Kids World repository instructions

## Procedural 3D models

Follow [the geometry guidelines](docs/geometry-guidelines.md). Use a mobile-first, colorful low-poly style with box-based shapes, clear silhouettes, solid colors, and simple shading. Use curved primitives where the shape calls for them and choose segment counts based on size, visibility, and purpose. Add detail for a clear visual or gameplay benefit.

Minimize triangles and draw calls. Reuse geometry and materials, preserve batching, and use instancing where it helps. Keep geometry and material creation out of the frame loop. Limit transparency and real-time shadows, follow the existing z-fighting rules, and use the existing Three.js renderer. Do not add rendering libraries or post-processing.

Keep area-specific models and behavior in their area. Group simple models or animals with shared behavior in one module. Give complex models a dedicated module when their responsibilities justify it. Move logic into shared code only when multiple areas actually use it.

## Codex final responses

End every completed task response with `Version: <short-version>`. Read the first 12 hexadecimal characters of the `version` field in the generated root `version.json`. Never invent or manually increment a release version.

When runtime files change, regenerate the release with `node scripts/generate-pwa-manifest.mjs`. Run `node scripts/generate-area-stats.mjs` first when area files change. If generation fails or the version cannot be determined, explain why and end with `Version: could not be determined`. If GitHub Actions may change the published release, identify the reported value as the local generated version in the preceding prose and keep the final line in the required format.

## GitHub delivery

For every task that changes this repository, validate the changes, commit them, and push a branch to `harboot/Kids-World`. Open a pull request targeting `main`, merge it after any required checks and reviews, and verify the merge on GitHub before reporting completion. Report any repository rule or permission that blocks the merge.
