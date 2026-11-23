export function furnishCabin(THREE, { cabin, mesh, box, matte, obstacles, collision, batchParts, deck, ceiling }) {
  const cream = matte(0xf5e4c7);
  const oak = matte(0xc28d59);
  const walnut = matte(0x694331);
  const green = matte(0x729678);
  const blue = matte(0x60868e);
  const terracotta = matte(0xb85f4f);
  const brass = matte(0xe0b267);
  const stone = matte(0xc9b19a);
  const metal = matte(0x778686);
  const charcoal = matte(0x3c4141);
  const porcelain = matte(0xf4eddf);
  const water = matte(0x82b4bd);
  const round = new THREE.CylinderGeometry(.5, .5, 1, 12);

  function group(name, x, z) {
    const model = new THREE.Group();
    model.name = name;
    model.position.set(x, deck, z);
    cabin.add(model);
    return model;
  }
  function part(parent, material, x, y, z, width, height, depth, geometry = box) {
    return mesh(geometry, material, x, y, z, width, height, depth, parent);
  }
  function solid(parent, x, z, width, depth, height) {
    obstacles.push(collision(parent.position.x + x, parent.position.z + z, width, depth, deck + height));
  }

  const bedroom = group('Garden house bed', -20.16, -25.99);
  part(bedroom, walnut, 0, .27, 0, 1.94, .35, 2.55);
  part(bedroom, oak, 0, .66, -1.24, 1.98, 1.28, .16);
  part(bedroom, oak, 0, .39, 1.23, 1.98, .72, .15);
  part(bedroom, cream, 0, .52, 0, 1.84, .18, 2.36);
  part(bedroom, green, 0, .635, .33, 1.85, .09, 1.66);
  for (const z of [.54, .79, 1.01]) part(bedroom, cream, 0, .69, z, 1.76, .02, .055);
  for (const x of [-.46, .46]) part(bedroom, cream, x, .695, -.76, .73, .15, .5);
  part(bedroom, walnut, 1.49, .31, -1, .69, .62, .68);
  part(bedroom, oak, 1.49, .64, -1, .76, .09, .74);
  part(bedroom, terracotta, 1.44, .713, -1, .36, .055, .29).rotation.y = .12;
  part(bedroom, blue, 1.51, .767, -1.03, .3, .048, .23).rotation.y = -.19;
  solid(bedroom, 0, 0, 1.98, 2.58, .76);
  solid(bedroom, 0, -1.24, 1.98, .16, 1.3);
  solid(bedroom, 1.49, -1, .76, .74, .79);

  const kitchen = group('Garden house kitchen', -14.62, -20.91);
  part(kitchen, green, 0, .43, 0, .86, .86, 3.56);
  part(kitchen, stone, 0, .87, .45, .96, .12, 2.72);
  part(kitchen, stone, 0, .87, -1.69, .96, .12, .18);
  for (const x of [-.39, .39]) part(kitchen, stone, x, .87, -1.255, .18, .12, .69);
  part(kitchen, metal, 0, .87, -1.255, .60, .018, .67);
  for (const x of [-.252, .252]) part(kitchen, metal, x, .905, -1.255, .086, .06, .67);
  for (const z of [-1.541, -.969]) part(kitchen, metal, 0, .905, z, .414, .06, .09);
  part(kitchen, metal, .33, 1.025, -1.22, .055, .24, .055, round);
  part(kitchen, metal, .235, 1.135, -1.22, .23, .05, .055);
  for (const z of [-1.19, -.4, .4, 1.21]) {
    part(kitchen, blue, -.442, .42, z, .045, .67, .66);
    part(kitchen, brass, -.481, .65, z, .055, .046, .20);
  }
  part(kitchen, charcoal, 0, .957, .87, .72, .054, 1.04);
  for (const z of [.63, 1.1]) part(kitchen, metal, 0, .995, z, .38, .021, .38, round);
  part(kitchen, terracotta, 0, 1.12, 1.1, .36, .23, .36, round);
  part(kitchen, brass, 0, 1.253, 1.1, .33, .045, .33, round);
  part(kitchen, walnut, 0, 1.29, 1.1, .082, .044, .082, round);
  part(kitchen, oak, .24, 1.63, -.42, .43, .10, 1.85);
  for (const [z, material] of [[-.99, cream], [-.68, terracotta], [-.35, blue]]) {
    part(kitchen, material, .23, 1.79, z, .2, .22, .2, round);
    part(kitchen, oak, .23, 1.922, z, .21, .045, .21, round);
  }
  solid(kitchen, 0, 0, .98, 3.62, 1.28);

  const bathroom = group('Garden house toilet and partition', -15.54, -27.18);
  part(bathroom, blue, 0, .015, .07, 3.13, .03, 2.93);
  for (const [x, z, width, depth] of [[-1.57, .03, .13, 3.12], [.60, 1.56, 1.87, .13]]) {
    part(bathroom, cream, x, 1.05, z, width, 2.1, depth);
    part(bathroom, oak, x, 2.11, z, width + .03, .09, depth + .03);
    solid(bathroom, x, z, width + .03, depth + .03, 2.155);
  }
  const toiletX = .58;
  part(bathroom, porcelain, toiletX, .19, -.61, .38, .38, .44, round);
  part(bathroom, porcelain, toiletX, .59, -1.04, .52, .70, .31);
  part(bathroom, porcelain, toiletX, .96, -1.04, .56, .07, .34);
  part(bathroom, brass, toiletX + .16, .76, -.868, .09, .045, .047);
  const bowl = new THREE.LatheGeometry([
    [.15, .29], [.224, .37], [.286, .50], [.286, .525],
    [.225, .525], [.205, .424], [.12, .353], [0, .353],
  ].map(([radius, height]) => new THREE.Vector2(radius, height)), 16);
  part(bathroom, porcelain, toiletX, 0, -.52, 1, 1, 1.15, bowl);
  part(bathroom, water, toiletX, .378, -.52, .27, .01, .30, round);
  solid(bathroom, toiletX, -.74, .62, .98, 1);
  part(bathroom, walnut, 1.14, .37, .69, .59, .74, .52);
  part(bathroom, porcelain, 1.14, .76, .69, .64, .10, .56);
  part(bathroom, metal, 1.34, .87, .69, .049, .17, .049, round);
  part(bathroom, metal, 1.25, .943, .69, .20, .045, .049);
  part(bathroom, oak, 1.51, 1.43, .69, .07, .66, .54);
  part(bathroom, water, 1.462, 1.43, .69, .032, .55, .42);
  solid(bathroom, 1.14, .69, .64, .56, .96);

  const room = group('Garden house rug and lamps', -18.42, -20.39);
  part(room, terracotta, 0, .016, 0, 2.6, .031, 3.1);
  for (const side of [-1, 1]) {
    part(room, cream, side * 1.15, .047, 0, .075, .018, 2.85);
    part(room, cream, 0, .047, side * 1.36, 2.23, .018, .075);
  }
  for (const z of [1, -4.2]) {
    part(room, walnut, 0, ceiling - deck - .09, z, .074, .19, .074, round);
    part(room, brass, 0, ceiling - deck - .27, z, .48, .18, .48, round);
    part(room, cream, 0, ceiling - deck - .373, z, .36, .038, .36, round);
  }
  for (const model of [bedroom, kitchen, bathroom, room]) batchParts(model);
}
