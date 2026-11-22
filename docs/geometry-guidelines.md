# 3D Geometry Guidelines

## Procedural model design

- Use colorful, geometric low-poly shapes across areas. Start with boxes and simple polygons, distinct silhouettes, solid colors, and flat or simple shading. Preserve the character of geometric objects.
- Use spheres, cylinders, and other curved primitives where they help communicate the shape. Choose the lowest useful segment count for the object's size, visibility, and role. Prefer faceted curves when they suit the model. Add subdivisions only when they provide a clear visual or gameplay benefit.
- Budget triangles and draw calls for mobile first. Share geometry and materials, preserve existing batching, and use `InstancedMesh` for repeated parts when it measurably helps. Limit transparency and real-time shadows. Reuse existing resources during updates and keep geometry and material allocation out of the frame loop. Use the existing Three.js renderer without new rendering libraries or post-processing.
- Organize models by area and responsibility. Small props can share a module, and animals with shared movement, interaction, and collision logic can live together. Use dedicated modules for complex models with independent behavior. Keep area gameplay in its area and put genuinely reusable engine logic in shared modules.

## Surface placement and z-fighting

- Give each visible surface its own plane wherever materials, colors, or decorative roles overlap. Adjacent faces may share an edge. For an inset on a level floor, fit the border around it and stop the supporting slab below both. Use one post where two railing spans share a corner.
- Measure from the base surface to the visible face of the detail. Use the local outward normal. Floor details usually move up, wall details project away from the wall, and roof details follow the pitch. Place a label on each outside face of a two-sided sign and orient each label toward its reader.
- Start with `SURFACE_GAP` in [core/geometry.js](../core/geometry.js). The values are 0.012 world units for small details, 0.025 for trim, and 0.04 for roof relief. Use the smallest separation that holds up at the intended camera distances. Seat solid trim against its base so the joint stays closed.
- Place details in the same local space as the surface and check the final parent or instance transform. Sample the full width of an overlay on uneven ground. Where practical, assign different materials to neighboring terrain triangles instead of layering another surface over them.
- Keep visual offsets separate from collision and traversal heights. Check close, medium, and oblique views while moving the camera, including the lower-resolution touch renderer. Compare with shadow casting toggled locally during diagnosis to distinguish shadow artifacts from competing geometry.
- Keep the renderer's depth settings intact. Prefer a geometry fix. Use local polygon offset only when a thin decal must share a plane, and verify that material on desktop and mobile.
