// The city's life: traffic cars looping along the road lines and pedestrians
// strolling the sidewalks. Both wrap around the city edge and steer clear of
// nothing — the roads are wide and the loops are spaced — but pedestrians flee
// when a shot is fired near them.
import * as THREE from 'three';
import { CITY, TRAFFIC } from './config.js';
import { createVehicle, randomCarColor } from './vehicles.js';

const PED_COLORS = [0xe74c3c, 0x3498db, 0x2ecc71, 0xf39c12, 0x9b59b6, 0x1abc9c, 0xecf0f1, 0x34495e];

function makePedMesh(color) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.9, 0.32),
    new THREE.MeshLambertMaterial({ color }),
  );
  body.position.y = 1.05;
  body.castShadow = true;
  group.add(body);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 10, 8),
    new THREE.MeshLambertMaterial({ color: 0xd8a077 }),
  );
  head.position.y = 1.75;
  head.castShadow = true;
  group.add(head);
  const legMat = new THREE.MeshLambertMaterial({ color: 0x2c3e50 });
  // Legs pivot at the hip: geometry translated down so rotation swings from the top.
  const legGeo = new THREE.BoxGeometry(0.2, 0.6, 0.2);
  legGeo.translate(0, -0.3, 0);
  const legL = new THREE.Mesh(legGeo, legMat);
  legL.position.set(0, 0.6, 0.14);
  group.add(legL);
  const legR = new THREE.Mesh(legGeo, legMat);
  legR.position.set(0, 0.6, -0.14);
  group.add(legR);
  return { group, legL, legR };
}

export function createTraffic(random, city, scene) {
  const half = CITY.half;
  const cars = [];
  const peds = [];
  const laneOffset = 3;

  // Traffic cars: each one owns a road line and a direction and loops it.
  for (let i = 0; i < TRAFFIC.cars; i += 1) {
    const line = city.roadLines[random.int(0, city.roadLines.length)];
    const direction = random.next() < 0.5 ? 1 : -1;
    const car = createVehicle(randomCarColor(random), false);
    const along = random.range(-half, half);
    if (line.axis === 'x') {
      car.x = along;
      car.z = line.at + direction * laneOffset;
      car.heading = direction > 0 ? 0 : Math.PI;
    } else {
      car.x = line.at + direction * laneOffset;
      car.z = along;
      car.heading = direction > 0 ? Math.PI / 2 : -Math.PI / 2;
    }
    car.speed = TRAFFIC.carSpeed * random.range(0.8, 1.15);
    car.driver = { line, direction };
    car.sync();
    scene.add(car.mesh.group);
    cars.push(car);
  }

  // Pedestrians: each one walks a sidewalk beside a road line.
  for (let i = 0; i < TRAFFIC.peds; i += 1) {
    const line = city.roadLines[random.int(0, city.roadLines.length)];
    const direction = random.next() < 0.5 ? 1 : -1;
    const mesh = makePedMesh(PED_COLORS[random.int(0, PED_COLORS.length)]);
    const along = random.range(-half, half);
    const side = random.next() < 0.5 ? 1 : -1;
    const ped = {
      mesh,
      axis: line.axis,
      at: line.at + side * (CITY.roadWidth / 2 + 1.5),
      along,
      direction,
      speed: TRAFFIC.pedSpeed * random.range(0.8, 1.3),
      flee: 0,
      walkPhase: random.range(0, Math.PI * 2),
    };
    mesh.group.position.set(
      line.axis === 'x' ? along : ped.at,
      0,
      line.axis === 'x' ? ped.at : along,
    );
    scene.add(mesh.group);
    peds.push(ped);
  }

  function step(dt) {
    for (const car of cars) {
      if (car.driver === null) continue; // stolen: the player drives it now
      const { line, direction } = car.driver;
      const stepDist = car.speed * dt;
      if (line.axis === 'x') {
        car.x += direction * stepDist;
        if (car.x > half + 10) car.x = -half - 10;
        if (car.x < -half - 10) car.x = half + 10;
      } else {
        car.z += direction * stepDist;
        if (car.z > half + 10) car.z = -half - 10;
        if (car.z < -half - 10) car.z = half + 10;
      }
      car.sync();
    }
    for (const ped of peds) {
      const speed = ped.flee > 0 ? ped.speed * 3.2 : ped.speed;
      if (ped.flee > 0) ped.flee -= dt;
      ped.along += ped.direction * speed * dt;
      if (ped.along > half + 8) ped.along = -half - 8;
      if (ped.along < -half - 8) ped.along = half + 8;
      ped.walkPhase += dt * (ped.flee > 0 ? 14 : 6);
      const swing = Math.sin(ped.walkPhase) * 0.45;
      ped.mesh.legL.rotation.z = swing;
      ped.mesh.legR.rotation.z = -swing;
      const x = ped.axis === 'x' ? ped.along : ped.at;
      const z = ped.axis === 'x' ? ped.at : ped.along;
      ped.mesh.group.position.set(x, 0, z);
      const heading = ped.axis === 'x'
        ? (ped.direction > 0 ? 0 : Math.PI)
        : (ped.direction > 0 ? Math.PI / 2 : -Math.PI / 2);
      ped.mesh.group.rotation.y = -heading;
    }
  }

  /** Pedestrians near (x, z) run away from it. */
  function scare(x, z, radius) {
    for (const ped of peds) {
      const px = ped.axis === 'x' ? ped.along : ped.at;
      const pz = ped.axis === 'x' ? ped.at : ped.along;
      if (Math.hypot(px - x, pz - z) < radius) ped.flee = 3;
    }
  }

  /** The nearest drivable traffic car to (x, z), within `radius` metres. */
  function nearestCar(x, z, radius) {
    let best = null;
    let bestDist = radius;
    for (const car of cars) {
      if (car.driver === null) continue;
      const dist = Math.hypot(car.x - x, car.z - z);
      if (dist < bestDist) {
        bestDist = dist;
        best = car;
      }
    }
    return best;
  }

  /** The nearest pedestrian to (x, z), within `radius` metres. */
  function nearestPed(x, z, radius) {
    let best = null;
    let bestDist = radius;
    for (const ped of peds) {
      const px = ped.axis === 'x' ? ped.along : ped.at;
      const pz = ped.axis === 'x' ? ped.at : ped.along;
      const dist = Math.hypot(px - x, pz - z);
      if (dist < bestDist) {
        bestDist = dist;
        best = ped;
      }
    }
    return best;
  }

  return { cars, peds, step, scare, nearestCar, nearestPed };
}
