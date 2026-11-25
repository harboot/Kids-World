# 3D Geometry Guidelines

## Procedural model design

- Use colorful, geometric shapes across areas. Prioritize appealing and recognizable forms, natural proportions, and convincing animation before optimization. Add geometry, curves, or subdivisions where they improve visual quality or gameplay; do not remove useful detail simply to reduce triangle counts.
- Balance visual quality with practical mobile performance. Evaluate the combined area and its camera views, rather than enforcing a fixed triangle or draw-call budget on each model. Share geometry and materials, preserve existing batching where suitable, and use `InstancedMesh` for repeated parts when it measurably helps. Limit transparency and real-time shadows. Reuse existing resources during updates and keep geometry and material allocation out of the frame loop. Use the existing Three.js renderer without new rendering libraries or post-processing.
- Organize models by area and responsibility. Small props can share a module, and animals with shared movement, interaction, and collision logic can live together. Use dedicated modules for complex models with independent behavior. Keep area gameplay in its area and put genuinely reusable engine logic in shared modules.

## Faceted low-poly

Use this style for all new and remodeled 3D models, from simple low-poly background assets to more detailed low-poly focal characters. Start with a clear silhouette, meaningful planes, and solid colors. Flat shading is the default, but selective smooth shading is allowed when it improves the shape without losing the overall style. Custom geometry, spheres, cylinders, and other curved primitives are allowed; choose segment counts and subdivisions according to the desired form, camera distance, and visual result, not an arbitrary maximum. Preserve useful facets rather than making every surface uniformly smooth.

- **Humanoids** use distinct planes for the jaw, cheeks, and nose, with a readable hair outline and a few visible folds in clothing. Use the [Kung Fu Hustle window resident](../areas/kung-fu-hustle/resident-model.js) as a reference for faces and limbs, and [Coolie](../areas/kung-fu-hustle/coolie.js) as a reference for a readable articulated character with a shaped face and chest, planted-foot squat animation, and a held kick. These are quality and structure references, not complexity limits. Spend detail where it matters: eyes, jaw, hair, clothing, hands, and joint silhouettes.
- **Animals** use distinct shapes for the muzzle, head, body, legs, wings, and tail as the species calls for them. Use a few larger planes to suggest fur, feathers, or scales in the silhouette.
- **Props, vehicles, and environment** use the main planes and edges to show what each object is made of. Shape furniture, buildings, plants, rocks, and terrain with details sized for their in-game camera distance.

Check each model manually in the game view and at mobile size; do not add GitHub Actions visual-preview workflows. Check for unintended holes, missing or inverted faces, degenerate triangles, visible gaps at joints during animation, and overlapping surfaces. Intentional openings and single-sided surfaces are permitted when appropriate; use correct face winding and normals instead of relying on double-sided rendering to hide defects. Organize moving parts around their joints or pivots, batch static details where practical, and reuse vertices on planar faces with matching normals and colors. When comparing revisions, count triangles including instances, count draw calls from the same area and camera view, and check the size of unique vertex and index buffers.

## Detail and performance

Choose complexity by visual importance, interaction, and visibility. Simple models are appropriate for background objects; recognizable or interactive characters may use more detailed anatomy, clothing, and accessories. The following triangle ranges are examples for planning only. They are neither minimums nor maximums, and a model outside a range does not require simplification solely for that reason.

| Model type | Illustrative triangle range |
| --- | ---: |
| Simple decorative prop | 12–500 |
| Complex prop | 500–5,000 |
| Animal | 300–3,000 |
| Background NPC | 500–2,000 |
| Interactive character | 1,000–5,000 |
| Main or focal character | 2,000–10,000 |

- Use `stats.html` and comparable in-game camera views to monitor total triangles, draw calls, and unique geometry-buffer size. Check mobile responsiveness, especially in busy scenes and during animation.
- Optimize measured or clearly identifiable bottlenecks first: repeated assets, unnecessary draw calls, unused geometry, costly shadows, and overdraw. Do not force an individual model to meet a generic count at the expense of visual quality.
- Keep geometry and material allocation out of the animation loop. Preserve sensible joint pivots, collision, and interaction behavior.
- Automated tests should verify geometry integrity and functional behavior, not impose arbitrary per-model triangle or draw-call ceilings. Performance-specific regression checks may use a justified, measured area-level budget when needed.

## Surface placement and z-fighting

- Give each visible surface its own plane wherever materials, colors, or decorative roles overlap. Adjacent faces may share an edge. For an inset on a level floor, fit the border around it and stop the supporting slab below both. Use one post where two railing spans share a corner.
- Measure from the base surface to the visible face of the detail. Use the local outward normal. Floor details usually move up, wall details project away from the wall, and roof details follow the pitch. Place a label on each outside face of a two-sided sign and orient each label toward its reader.
- Start with `SURFACE_GAP` in [core/geometry.js](../core/geometry.js). The values are 0.012 world units for small details, 0.025 for trim, and 0.04 for roof relief. Use the smallest separation that holds up at the intended camera distances. Seat solid trim against its base so the joint stays closed.
- Place details in the same local space as the surface and check the final parent or instance transform. Sample the full width of an overlay on uneven ground. Where practical, assign different materials to neighboring terrain triangles instead of layering another surface over them.
- Keep visual offsets separate from collision and traversal heights. Check close, medium, and oblique views while moving the camera, including the lower-resolution touch renderer. Compare with shadow casting toggled locally during diagnosis to distinguish shadow artifacts from competing geometry.
- Keep the renderer's depth settings intact. Prefer a geometry fix. Use local polygon offset only when a thin decal must share a plane, and verify that material on desktop and mobile.
