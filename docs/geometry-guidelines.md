# 3D Geometry Guidelines

## Procedural model design

- Use colorful, geometric shapes across areas. Add subdivisions only when they provide a clear visual or gameplay benefit.
- Budget triangles and draw calls for mobile first. Share geometry and materials, preserve existing batching, and use `InstancedMesh` for repeated parts when it measurably helps. Limit transparency and real-time shadows. Reuse existing resources during updates and keep geometry and material allocation out of the frame loop. Use the existing Three.js renderer without new rendering libraries or post-processing.
- Organize models by area and responsibility. Small props can share a module, and animals with shared movement, interaction, and collision logic can live together. Use dedicated modules for complex models with independent behavior. Keep area gameplay in its area and put genuinely reusable engine logic in shared modules.

## Faceted low-poly

Use this style for all new and remodeled 3D models. Start with a clear silhouette and a few distinct planes with flat normals and solid colors. For rounded forms, choose the lowest useful segment count for the object's size and visibility. Eyes, wheels, trunks, and snowballs can use simple curved primitives with readable facets.

- **Humanoids** use distinct planes for the jaw, cheeks, and nose, with a readable hair outline and a few visible folds in clothing. Use the [Kung Fu Hustle window resident](../areas/kung-fu-hustle/resident-model.js) as the reference for faces and limbs.
- **Animals** use distinct shapes for the muzzle, head, body, legs, wings, and tail as the species calls for them. Use a few larger planes to suggest fur, feathers, or scales in the silhouette.
- **Props, vehicles, and environment** use the main planes and edges to show what each object is made of. Shape furniture, buildings, plants, rocks, and terrain with details sized for their in-game camera distance.

Check each model in the game view and at mobile size. Organize moving parts around their joints or pivots, batch static details where practical, and reuse vertices on planar faces with matching normals and colors. When comparing revisions, count triangles including instances, count draw calls from the same area and camera view, and check the size of unique vertex and index buffers.

## Surface placement and z-fighting

- Give each visible surface its own plane wherever materials, colors, or decorative roles overlap. Adjacent faces may share an edge. For an inset on a level floor, fit the border around it and stop the supporting slab below both. Use one post where two railing spans share a corner.
- Measure from the base surface to the visible face of the detail. Use the local outward normal. Floor details usually move up, wall details project away from the wall, and roof details follow the pitch. Place a label on each outside face of a two-sided sign and orient each label toward its reader.
- Start with `SURFACE_GAP` in [core/geometry.js](../core/geometry.js). The values are 0.012 world units for small details, 0.025 for trim, and 0.04 for roof relief. Use the smallest separation that holds up at the intended camera distances. Seat solid trim against its base so the joint stays closed.
- Place details in the same local space as the surface and check the final parent or instance transform. Sample the full width of an overlay on uneven ground. Where practical, assign different materials to neighboring terrain triangles instead of layering another surface over them.
- Keep visual offsets separate from collision and traversal heights. Check close, medium, and oblique views while moving the camera, including the lower-resolution touch renderer. Compare with shadow casting toggled locally during diagnosis to distinguish shadow artifacts from competing geometry.
- Keep the renderer's depth settings intact. Prefer a geometry fix. Use local polygon offset only when a thin decal must share a plane, and verify that material on desktop and mobile.
