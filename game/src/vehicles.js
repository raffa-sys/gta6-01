// Cars: a box-body model with a cabin, wheels and lights, built once per car
// from shared geometry, plus the arcade driving physics (accelerate, steer,
// brake, reverse) and the enter/exit handoff with the player on foot.
import * as THREE from 'three';
import { CAR } from './config.js';

const CAR_COLORS = [0xc0392b, 0x2e86c1, 0xf1c40f, 0x27ae60, 0x8e44ad, 0xe67e22, 0x95a5a6, 0x1a1a1a, 0xecf0f1, 0x16a085];

const bodyGeo = new THREE.BoxGeometry(CAR.length, 0.75, CAR.width);
const cabinGeo = new THREE.BoxGeometry(2.2, 0.65, CAR.width - 0.3);
const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.28, 10);
const lightGeo = new THREE.BoxGeometry(0.12, 0.22, 0.5);
const barGeo = new THREE.BoxGeometry(0.5, 0.18, 1.4);

/** Build one car mesh. `police` gets a white body and a red/blue light bar. */
export function makeCarMesh(color, police = false) {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: police ? 0xf2f2f2 : color });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0.62;
  body.castShadow = true;
  group.add(body);
  const cabin = new THREE.Mesh(cabinGeo, new THREE.MeshLambertMaterial({ color: 0x1c2733 }));
  cabin.position.set(-0.2, 1.3, 0);
  cabin.castShadow = true;
  group.add(cabin);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x141414 });
  const wheelPositions = [
    [1.45, 0.36, 0.95], [1.45, 0.36, -0.95],
    [-1.45, 0.36, 0.95], [-1.45, 0.36, -0.95],
  ];
  const wheels = [];
  for (const [x, y, z] of wheelPositions) {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(x, y, z);
    group.add(wheel);
    wheels.push(wheel);
  }
  const headMat = new THREE.MeshBasicMaterial({ color: 0xfff6c8 });
  for (const z of [-0.6, 0.6]) {
    const head = new THREE.Mesh(lightGeo, headMat);
    head.position.set(CAR.length / 2 + 0.02, 0.66, z);
    group.add(head);
  }
  const tailMat = new THREE.MeshBasicMaterial({ color: 0xff2a1a });
  for (const z of [-0.6, 0.6]) {
    const tail = new THREE.Mesh(lightGeo, tailMat);
    tail.position.set(-CAR.length / 2 - 0.02, 0.66, z);
    group.add(tail);
  }
  let lightBar = null;
  if (police) {
    lightBar = new THREE.Group();
    const red = new THREE.Mesh(barGeo, new THREE.MeshBasicMaterial({ color: 0xff2020 }));
    red.position.z = 0.4;
    const blue = new THREE.Mesh(barGeo, new THREE.MeshBasicMaterial({ color: 0x2040ff }));
    blue.position.z = -0.4;
    lightBar.add(red);
    lightBar.add(blue);
    lightBar.position.set(-0.2, 1.72, 0);
    group.add(lightBar);
  }
  return { group, wheels, lightBar };
}

export function createVehicle(color, police = false) {
  const mesh = makeCarMesh(color, police);
  return {
    mesh,
    x: 0,
    z: 0,
    heading: 0,
    speed: 0,
    police,
    color,
    // Traffic cars drive themselves; the player's car is driven by input.
    driver: null,
    sync() {
      mesh.group.position.set(this.x, 0, this.z);
      mesh.group.rotation.y = -this.heading;
      const spin = this.speed * 0.016;
      for (const wheel of mesh.wheels) wheel.rotation.z += spin;
    },
  };
}

/** Pick a colour the player hasn't just used, from the palette. */
export function randomCarColor(random, avoid) {
  let color = CAR_COLORS[random.int(0, CAR_COLORS.length)];
  let tries = 0;
  while (color === avoid && tries < 5) {
    color = CAR_COLORS[random.int(0, CAR_COLORS.length)];
    tries += 1;
  }
  return color;
}

/**
 * One step of arcade driving. `throttle` -1..1, `steer` -1..1 (left positive).
 * Returns the distance travelled, for the engine sound and the speedometer.
 */
export function driveStep(car, throttle, steer, dt, collide) {
  const accel = throttle > 0 ? CAR.accel : CAR.reverseAccel;
  if (throttle !== 0) car.speed += throttle * accel * dt;
  else car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 8 * dt);
  if (throttle < 0 && car.speed > 0.5) car.speed -= CAR.brake * dt; // brake first, then reverse
  car.speed = Math.max(-CAR.maxReverse, Math.min(CAR.maxSpeed, car.speed));
  const steerAmount = steer * CAR.steer * dt * Math.min(1, Math.abs(car.speed) / 6 + 0.25) * Math.sign(car.speed || 1);
  car.heading += steerAmount;
  const nx = car.x + Math.cos(car.heading) * car.speed * dt;
  const nz = car.z + Math.sin(car.heading) * car.speed * dt;
  const hit = collide(nx, nz);
  if (hit) {
    car.speed *= -0.25; // bounce off the wall, keep a little speed
  } else {
    car.x = nx;
    car.z = nz;
  }
  car.sync();
  return Math.abs(car.speed) * dt;
}
