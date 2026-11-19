// The story: three jobs for "Rico", a driver-for-hire in Solar Bay, played in
// order. Each mission names a target place and a condition; the world checks
// the condition every step and the manager pays out and advances on success.
// After the third job the player keeps the city in free roam.
import * as THREE from 'three';

const MISSION_DEFS = [
  {
    id: 1,
    title: 'Job 1 — The Pickup',
    brief: 'Rico needs a package from the docks. Get to the gold marker.',
    place: 'docks',
    reward: 250,
    doneText: 'Package collected. Rico is pleased.',
  },
  {
    id: 2,
    title: 'Job 2 — Hot Wheels',
    brief: 'Rico needs wheels, fast. Steal any car (E) and bring it to the plaza.',
    place: 'plaza',
    reward: 400,
    needsCar: true,
    doneText: 'Car delivered. The cops noticed, but Rico pays well.',
  },
  {
    id: 3,
    title: 'Job 3 — The Getaway',
    brief: 'The heat is on. Reach the hideout and lose the cops.',
    place: 'hideout',
    reward: 600,
    needsHeatGone: true,
    doneText: 'Clean. You are a Solar Bay legend now.',
  },
];

function makeMarkerMesh() {
  const group = new THREE.Group();
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(2.4, 0.22, 8, 32),
    new THREE.MeshBasicMaterial({ color: 0xffd23f }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.3;
  group.add(ring);
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.7, 0.7, 40, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false }),
  );
  beam.position.y = 20;
  group.add(beam);
  return { group, ring, beam };
}

export function createMissions(scene, places) {
  const marker = makeMarkerMesh();
  marker.group.visible = false;
  scene.add(marker.group);
  let index = 0; // 0-based into MISSION_DEFS; >= length means story complete
  let phase = 0; // seconds the "mission complete" banner shows

  function current() {
    return index < MISSION_DEFS.length ? MISSION_DEFS[index] : null;
  }

  function target() {
    const mission = current();
    return mission ? places[mission.place] : null;
  }

  function placeMarker() {
    const point = target();
    if (point) {
      marker.group.position.set(point.x, 0, point.z);
      marker.group.visible = true;
    } else {
      marker.group.visible = false;
    }
  }

  placeMarker();

  function objectiveText(playerX, playerZ, inCar) {
    const mission = current();
    if (!mission) return 'Free roam — Solar Bay is yours. Earn cash, dodge the cops.';
    const point = places[mission.place];
    const dist = Math.round(Math.hypot(point.x - playerX, point.z - playerZ));
    let text = `${mission.title}: ${mission.brief} (${dist}m)`;
    if (mission.needsCar && !inCar) text += ' — find a car first!';
    if (mission.needsHeatGone) text += ' — lose the wanted stars!';
    return text;
  }

  /**
   * Check the current mission against the world. Returns the reward earned
   * this step, or 0. `world` carries { x, z, inCar, wanted }.
   */
  function step(dt, world) {
    const mission = current();
    if (!mission) return 0;
    const point = places[mission.place];
    const dist = Math.hypot(point.x - world.x, point.z - world.z);
    const atTarget = dist < 6;
    if (mission.needsCar && !world.inCar) return 0;
    if (mission.needsHeatGone && world.wanted > 0) return 0;
    if (!atTarget) return 0;
    const reward = mission.reward;
    index += 1;
    phase = 3;
    placeMarker();
    return reward;
  }

  function stepBanner(dt) {
    if (phase > 0) phase -= dt;
  }

  function banner() {
    if (phase <= 0) return '';
    const done = MISSION_DEFS[index - 1];
    return done ? `JOB DONE — ${done.doneText} +$${done.reward}` : '';
  }

  function saveState() {
    return { index };
  }

  function loadState(saved) {
    if (saved && Number.isInteger(saved.index)) {
      index = Math.max(0, Math.min(MISSION_DEFS.length, saved.index));
      placeMarker();
    }
  }

  return {
    current,
    target,
    marker,
    objectiveText,
    step,
    stepBanner,
    banner,
    saveState,
    loadState,
    get done() {
      return index >= MISSION_DEFS.length;
    },
    get index() {
      return index;
    },
  };
}
