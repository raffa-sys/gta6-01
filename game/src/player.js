// The player on foot: a simple articulated figure (jacket, head, swinging
// legs) that walks and runs with WASD, turns with the camera, and hands the
// camera a smooth third-person follow. Driving is the car's job, in vehicles.js.
import * as THREE from 'three';
import { PLAYER } from './config.js';

function makePlayerMesh() {
  const group = new THREE.Group();
  const jacket = new THREE.MeshLambertMaterial({ color: 0xd35400 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.85, 0.36), jacket);
  body.position.y = 1.12;
  body.castShadow = true;
  group.add(body);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.24, 12, 10),
    new THREE.MeshLambertMaterial({ color: 0xd8a077 }),
  );
  head.position.y = 1.78;
  head.castShadow = true;
  group.add(head);
  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.25, 0.26, 0.1, 12),
    new THREE.MeshLambertMaterial({ color: 0x1a1a1a }),
  );
  cap.position.y = 1.96;
  group.add(cap);
  const legGeo = new THREE.BoxGeometry(0.22, 0.7, 0.22);
  legGeo.translate(0, -0.35, 0);
  const legMat = new THREE.MeshLambertMaterial({ color: 0x2c3e50 });
  const legL = new THREE.Mesh(legGeo, legMat);
  legL.position.set(0, 0.7, 0.16);
  group.add(legL);
  const legR = new THREE.Mesh(legGeo, legMat);
  legR.position.set(0, 0.7, -0.16);
  group.add(legR);
  const armGeo = new THREE.BoxGeometry(0.16, 0.65, 0.16);
  armGeo.translate(0, -0.32, 0);
  const armL = new THREE.Mesh(armGeo, jacket);
  armL.position.set(0, 1.5, 0.4);
  group.add(armL);
  const armR = new THREE.Mesh(armGeo, jacket);
  armR.position.set(0, 1.5, -0.4);
  group.add(armR);
  return { group, legL, legR, armL, armR };
}

export function createPlayer(scene) {
  const mesh = makePlayerMesh();
  scene.add(mesh.group);
  const state = {
    x: 0,
    z: 22,
    heading: 0, // facing angle in the x-z plane
    walkPhase: 0,
    moving: false,
    mesh,
  };

  function sync() {
    mesh.group.position.set(state.x, 0, state.z);
    mesh.group.rotation.y = -state.heading;
  }

  /**
   * Walk or run. `move` is { forward, strafe, run }, `camYaw` is the camera's
   * yaw so W always walks away from the camera. Returns metres travelled.
   */
  function step(dt, move, camYaw, collide) {
    const speed = move.run ? PLAYER.runSpeed : PLAYER.walkSpeed;
    const fx = Math.cos(camYaw);
    const fz = Math.sin(camYaw);
    const rx = -fz;
    const rz = fx;
    let mx = fx * move.forward + rx * move.strafe;
    let mz = fz * move.forward + rz * move.strafe;
    const len = Math.hypot(mx, mz);
    state.moving = len > 0.01;
    if (!state.moving) {
      mesh.legL.rotation.z = 0;
      mesh.legR.rotation.z = 0;
      mesh.armL.rotation.z = 0;
      mesh.armR.rotation.z = 0;
      return 0;
    }
    mx /= len;
    mz /= len;
    const nx = state.x + mx * speed * dt;
    const nz = state.z + mz * speed * dt;
    if (!collide(nx, state.z)) state.x = nx;
    if (!collide(state.x, nz)) state.z = nz;
    state.heading = Math.atan2(mz, mx);
    state.walkPhase += dt * (move.run ? 13 : 9);
    const swing = Math.sin(state.walkPhase) * 0.6;
    mesh.legL.rotation.z = swing;
    mesh.legR.rotation.z = -swing;
    mesh.armL.rotation.z = -swing * 0.7;
    mesh.armR.rotation.z = swing * 0.7;
    sync();
    return speed * dt;
  }

  sync();
  return { state, mesh, step, sync };
}
