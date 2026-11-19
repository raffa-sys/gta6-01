// Solar Bay itself: a sun-soaked grid city with a beach and sea to the west.
// Builds every mesh from boxes, planes and cylinders with procedural canvas
// textures — no model files — and hands back the building colliders, the road
// lines the traffic drives on, and a few named places the missions use.
import * as THREE from 'three';
import { CITY, PALETTE } from './config.js';

/** Make a lit-window texture for building faces, drawn on a canvas. */
function buildingTexture(base, lit) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 128, 256);
  for (let row = 0; row < 12; row += 1) {
    for (let col = 0; col < 6; col += 1) {
      const on = (row * 7 + col * 3) % 5 !== 0;
      ctx.fillStyle = on ? lit : '#20242c';
      ctx.fillRect(10 + col * 20, 12 + row * 20, 12, 14);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const BUILDING_COLORS = [
  ['#e8dcc8', '#ffd98a'],
  ['#d8c2a8', '#ffe9b0'],
  ['#b8c8d8', '#fff2c0'],
  ['#d8a8a0', '#ffd98a'],
  ['#c8d8b8', '#fff2c0'],
  ['#e0b890', '#ffe9b0'],
];

/** One palm tree: a leaning trunk and a crown of flat fronds. */
function makePalm() {
  const group = new THREE.Group();
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8a6a48 });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 4.2, 6), trunkMat);
  trunk.position.y = 2.1;
  trunk.rotation.z = 0.08;
  group.add(trunk);
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x3f8f4f });
  for (let i = 0; i < 7; i += 1) {
    const frond = new THREE.Mesh(new THREE.ConeGeometry(0.55, 2.6, 4), leafMat);
    const angle = (i / 7) * Math.PI * 2;
    frond.position.set(Math.cos(angle) * 0.9, 4.3, Math.sin(angle) * 0.9);
    frond.rotation.z = Math.cos(angle) * 1.1;
    frond.rotation.x = -Math.sin(angle) * 1.1;
    group.add(frond);
  }
  return group;
}

/** One street lamp: a dark pole with a warm glowing head. */
function makeLamp() {
  const group = new THREE.Group();
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.09, 5, 6),
    new THREE.MeshLambertMaterial({ color: 0x2c2f36 }),
  );
  pole.position.y = 2.5;
  group.add(pole);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0xffe9a8 }),
  );
  head.position.y = 5.1;
  group.add(head);
  return group;
}

export function createCity(random) {
  const group = new THREE.Group();
  const colliders = [];
  const roadLines = [];
  const half = CITY.half;
  const span = CITY.blockSpan;

  // Ground: grass-green base, sand strip and sea to the west.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(half * 2 + 260, half * 2 + 40),
    new THREE.MeshLambertMaterial({ color: PALETTE.grass }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(-60, 0, 0);
  ground.receiveShadow = true;
  group.add(ground);

  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(46, half * 2 + 40),
    new THREE.MeshLambertMaterial({ color: PALETTE.sand }),
  );
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(-half - 23, 0.01, 0);
  sand.receiveShadow = true;
  group.add(sand);

  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(220, half * 2 + 40),
    new THREE.MeshLambertMaterial({ color: PALETTE.sea }),
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(-half - 46 - 110, 0.02, 0);
  group.add(sea);

  // Roads: one strip per grid line, plus pale sidewalk borders.
  const roadMat = new THREE.MeshLambertMaterial({ color: PALETTE.road });
  const walkMat = new THREE.MeshLambertMaterial({ color: PALETTE.sidewalk });
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xd8d2a0 });
  const lines = [];
  for (let c = -half; c <= half; c += span) lines.push(c);
  for (const c of lines) {
    const roadX = new THREE.Mesh(new THREE.PlaneGeometry(CITY.roadWidth, half * 2), roadMat);
    roadX.rotation.x = -Math.PI / 2;
    roadX.position.set(c, 0.02, 0);
    roadX.receiveShadow = true;
    group.add(roadX);
    const roadZ = new THREE.Mesh(new THREE.PlaneGeometry(half * 2, CITY.roadWidth), roadMat);
    roadZ.rotation.x = -Math.PI / 2;
    roadZ.position.set(0, 0.02, c);
    roadZ.receiveShadow = true;
    group.add(roadZ);
    const walkX = new THREE.Mesh(new THREE.PlaneGeometry(CITY.roadWidth + 6, half * 2), walkMat);
    walkX.rotation.x = -Math.PI / 2;
    walkX.position.set(c, 0.015, 0);
    group.add(walkX);
    const walkZ = new THREE.Mesh(new THREE.PlaneGeometry(half * 2, CITY.roadWidth + 6), walkMat);
    walkZ.rotation.x = -Math.PI / 2;
    walkZ.position.set(0, 0.015, c);
    group.add(walkZ);
    // Dashed centre line along each road.
    for (let d = -half + 8; d < half; d += 16) {
      const dashX = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 6), lineMat);
      dashX.rotation.x = -Math.PI / 2;
      dashX.position.set(c, 0.03, d);
      group.add(dashX);
      const dashZ = new THREE.Mesh(new THREE.PlaneGeometry(6, 0.4), lineMat);
      dashZ.rotation.x = -Math.PI / 2;
      dashZ.position.set(d, 0.03, c);
      group.add(dashZ);
    }
    roadLines.push({ axis: 'x', at: c });
    roadLines.push({ axis: 'z', at: c });
  }

  // Buildings: one or two per block, heights and colours varied by seed.
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const textures = BUILDING_COLORS.map(([base, lit]) => buildingTexture(base, lit));
  const materials = textures.map(
    (map) => new THREE.MeshLambertMaterial({ map }),
  );
  for (let bx = -half; bx < half; bx += span) {
    for (let bz = -half; bz < half; bz += span) {
      const x0 = bx + CITY.roadWidth / 2 + CITY.sidewalk;
      const z0 = bz + CITY.roadWidth / 2 + CITY.sidewalk;
      const w = span - CITY.roadWidth - CITY.sidewalk * 2;
      if (random.next() < 0.18) continue; // some blocks stay open plazas
      const twin = random.next() < 0.45;
      const count = twin ? 2 : 1;
      for (let i = 0; i < count; i += 1) {
        const bw = twin ? w / 2 - 2 : w - 4;
        const bd = twin ? w - 4 : w - 4;
        const bh = random.range(8, 34);
        const cx = x0 + (twin ? i * (w / 2) + w / 4 : w / 2);
        const cz = z0 + w / 2;
        const mat = materials[random.int(0, materials.length)];
        const building = new THREE.Mesh(boxGeo, mat);
        building.scale.set(bw, bh, bd);
        building.position.set(cx, bh / 2, cz);
        building.castShadow = true;
        building.receiveShadow = true;
        group.add(building);
        // A flat roof cap in a darker shade.
        const roof = new THREE.Mesh(
          new THREE.BoxGeometry(bw + 0.6, 0.5, bd + 0.6),
          new THREE.MeshLambertMaterial({ color: 0x4a4038 }),
        );
        roof.position.set(cx, bh + 0.25, cz);
        group.add(roof);
        colliders.push({ minX: cx - bw / 2, maxX: cx + bw / 2, minZ: cz - bd / 2, maxZ: cz + bd / 2 });
      }
    }
  }

  // Palms along the beachfront and lamps at the intersections.
  for (let z = -half + 10; z <= half; z += 22) {
    const palm = makePalm();
    palm.position.set(-half - 8 + random.range(-2, 2), 0, z);
    group.add(palm);
  }
  for (const c of lines) {
    for (const d of lines) {
      if (random.next() < 0.5) continue;
      const lamp = makeLamp();
      lamp.position.set(c + CITY.roadWidth / 2 + 1, 0, d + CITY.roadWidth / 2 + 1);
      group.add(lamp);
    }
  }

  // The boardwalk sign on the beach: the city's name, drawn on a canvas.
  const signCanvas = document.createElement('canvas');
  signCanvas.width = 512;
  signCanvas.height = 128;
  const sctx = signCanvas.getContext('2d');
  sctx.fillStyle = '#1f6f8b';
  sctx.fillRect(0, 0, 512, 128);
  sctx.fillStyle = '#ffe9a8';
  sctx.font = 'bold 64px system-ui, sans-serif';
  sctx.textAlign = 'center';
  sctx.textBaseline = 'middle';
  sctx.fillText('SOLAR BAY', 256, 66);
  const signTex = new THREE.CanvasTexture(signCanvas);
  signTex.colorSpace = THREE.SRGBColorSpace;
  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(12, 3, 0.5),
    new THREE.MeshLambertMaterial({ map: signTex }),
  );
  sign.position.set(-half - 6, 4, 0);
  sign.rotation.y = Math.PI / 2;
  group.add(sign);
  const postA = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 4, 6), new THREE.MeshLambertMaterial({ color: 0x5a4632 }));
  postA.position.set(-half - 6, 2, -5);
  group.add(postA);
  const postB = postA.clone();
  postB.position.z = 5;
  group.add(postB);

  return {
    group,
    colliders,
    roadLines,
    places: {
      docks: { x: -half + 22, z: half - 22 },
      hideout: { x: half - 22, z: -half + 22 },
      plaza: { x: 0, z: 0 },
      beach: { x: -half - 12, z: 40 },
    },
  };
}
