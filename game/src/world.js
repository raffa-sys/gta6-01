// The game's rules and state, with no drawing and no browser in it beyond the
// save slot: the player, the car they drive, the traffic, the police, the
// missions and the combat, advanced one fixed step at a time. step() returns
// what happened as bit flags so the caller can play the matching sound.
import { CAR, CITY, PLAYER, POLICE, STEP, WANTED } from './config.js';
import { createCity } from './city.js';
import { createPlayer } from './player.js';
import { createTraffic } from './traffic.js';
import { createPolice } from './police.js';
import { createMissions } from './missions.js';
import { createCombat, GUN_DAMAGE, PUNCH_DAMAGE } from './combat.js';
import { createVehicle, driveStep, randomCarColor } from './vehicles.js';

export const EVENT_CRIME = 1;
export const EVENT_MISSION = 2;
export const EVENT_BUSTED = 4;
export const EVENT_WASTED = 8;
export const EVENT_SHOT = 16;
export const EVENT_PUNCH = 32;

function clampToCity(value) {
  return Math.max(-CITY.half - 30, Math.min(CITY.half + 30, value));
}

export function createWorld(random, renderer) {
  const scene = renderer.scene;
  const city = createCity(random);
  scene.add(city.group);

  const player = createPlayer(scene);
  const traffic = createTraffic(random, city, scene);
  const police = createPolice(random, scene, collidePoint);
  const missions = createMissions(scene, city.places);
  const combat = createCombat(scene, renderer.camera);

  // Parked cars the player can steal, lined up in the right lane of the
  // north-south road through the plaza, facing down the road.
  const parked = [];
  for (let i = 0; i < 4; i += 1) {
    const car = createVehicle(randomCarColor(random), false);
    car.x = 3.5;
    car.z = -46 + i * 7;
    car.heading = Math.PI / 2;
    car.driver = null;
    car.sync();
    scene.add(car.mesh.group);
    parked.push(car);
  }

  const state = {
    cash: 100,
    health: PLAYER.health,
    inCar: false,
    car: null,
    elapsed: 0,
    speed: 0,
  };

  /** True when the point (x, z) is inside a building or outside the city. */
  function collidePoint(x, z) {
    if (x < -CITY.half - 34 || x > CITY.half + 34 || z < -CITY.half - 6 || z > CITY.half + 6) return true;
    for (const box of city.colliders) {
      if (x > box.minX - 0.6 && x < box.maxX + 0.6 && z > box.minZ - 0.6 && z < box.maxZ + 0.6) return true;
    }
    return false;
  }

  /** The nearest car the player could steal, parked or in traffic. */
  function stealableCar() {
    const p = player.state;
    let best = null;
    let bestDist = 5;
    for (const car of parked) {
      if (car === state.car) continue;
      const dist = Math.hypot(car.x - p.x, car.z - p.z);
      if (dist < bestDist) {
        bestDist = dist;
        best = car;
      }
    }
    const trafficCar = traffic.nearestCar(p.x, p.z, 5);
    if (trafficCar) {
      const dist = Math.hypot(trafficCar.x - p.x, trafficCar.z - p.z);
      if (dist < bestDist) best = trafficCar;
    }
    return best;
  }

  function enterCar(car) {
    state.inCar = true;
    state.car = car;
    car.driver = 'player';
    player.state.x = car.x;
    player.state.z = car.z;
    player.mesh.group.visible = false;
    police.addWanted(WANTED.stealCar);
    return EVENT_CRIME;
  }

  function exitCar() {
    const car = state.car;
    if (!car) return;
    car.speed = 0;
    // Step out to the car's left side.
    const px = car.x + Math.sin(car.heading) * 2.5;
    const pz = car.z - Math.cos(car.heading) * 2.5;
    player.state.x = collidePoint(px, pz) ? car.x + 3 : px;
    player.state.z = collidePoint(px, pz) ? car.z : pz;
    player.state.x = clampToCity(player.state.x);
    player.state.z = clampToCity(player.state.z);
    player.mesh.group.visible = true;
    player.sync();
    state.inCar = false;
    state.car = null;
    renderer.snapBehind(player.state.heading);
  }

  /** A pedestrian hit by the player's car: a crime, and the ped is knocked down. */
  function hitPedestrian(ped) {
    ped.flee = 5;
    police.addWanted(WANTED.hitPed);
    state.health = Math.max(0, state.health - 2);
    return EVENT_CRIME;
  }

  function damagePlayer(amount) {
    state.health -= amount;
    if (state.health <= 0) {
      state.health = 0;
      return EVENT_WASTED;
    }
    return 0;
  }

  /** Shootable targets for the pistol raycast: peds and police cars. */
  function shootTargets() {
    const targets = [];
    for (const ped of traffic.peds) {
      const px = ped.axis === 'x' ? ped.along : ped.at;
      const pz = ped.axis === 'x' ? ped.at : ped.along;
      targets.push({ mesh: ped.mesh.group, x: px, z: pz, kind: 'ped', ref: ped });
    }
    for (const car of police.cars) {
      targets.push({ mesh: car.mesh.group, x: car.x, z: car.z, kind: 'cop', ref: car });
    }
    return targets;
  }

  function resolveShot(result) {
    if (result === 'miss' || result === 'reload' || result === null) return 0;
    const target = result;
    traffic.scare(target.x, target.z, 25);
    police.addWanted(target.kind === 'cop' ? WANTED.hitCop : WANTED.shoot);
    if (target.kind === 'ped') {
      target.ref.flee = 6;
    }
    return EVENT_CRIME;
  }

  function resolvePunch(target) {
    if (!target) return 0;
    traffic.scare(target.x, target.z, 20);
    police.addWanted(WANTED.hitPed);
    return EVENT_CRIME;
  }

  function step(dt, input, actions) {
    let events = 0;
    state.elapsed += dt;
    const p = player.state;

    // Camera orbit from the mouse drag.
    const mouse = input.takeMouseDelta();
    if (mouse.x !== 0 || mouse.y !== 0) renderer.orbit(mouse.x, mouse.y);

    if (actions.enterCar) {
      if (state.inCar) exitCar();
      else {
        const car = stealableCar();
        if (car) events |= enterCar(car);
      }
    }

    if (state.inCar && state.car) {
      const drive = input.drive();
      driveStep(state.car, drive.throttle, drive.steer, dt, collidePoint);
      state.speed = state.car.speed;
      // Running a pedestrian over is a crime.
      const ped = traffic.nearestPed(state.car.x, state.car.z, 2.2);
      if (ped && Math.abs(state.car.speed) > 3) events |= hitPedestrian(ped);
      // Hitting a police car hard is a crime too.
      for (const cop of police.cars) {
        if (Math.hypot(cop.x - state.car.x, cop.z - state.car.z) < 3.6
          && Math.abs(state.car.speed) > 5) {
          police.addWanted(WANTED.hitCop);
          events |= EVENT_CRIME;
          state.car.speed *= 0.4;
        }
      }
    } else {
      state.speed = 0;
      const move = input.move();
      player.step(dt, move, renderer.camYaw, collidePoint);
      if (actions.punch) {
        events |= EVENT_PUNCH;
        const targets = shootTargets().filter((t) => t.kind === 'ped');
        const hit = combat.punch(p.x, p.z, p.heading, targets);
        if (hit) events |= resolvePunch(hit);
      }
      if (input.takeShot()) {
        events |= EVENT_SHOT;
        const result = combat.shoot(shootTargets());
        events |= resolveShot(result);
      }
      if (actions.reload) combat.reload();
    }

    traffic.step(dt);
    const policeResult = police.step(dt, state.inCar && state.car ? state.car : p, state.inCar);
    if (policeResult.busted) events |= EVENT_BUSTED;
    combat.step(dt);
    missions.stepBanner(dt);

    const reward = missions.step(dt, {
      x: p.x,
      z: p.z,
      inCar: state.inCar,
      wanted: police.wanted,
    });
    if (reward > 0) {
      state.cash += reward;
      events |= EVENT_MISSION;
    }

    // Slow health regen while the heat is off.
    if (police.wanted === 0 && state.health > 0 && state.health < PLAYER.health) {
      state.health = Math.min(PLAYER.health, state.health + dt * 2);
    }

    renderer.stepClouds(dt);
    return events;
  }

  /** A fresh story: cash, health, missions and position back to the start. */
  function reset() {
    police.clear();
    if (state.inCar) exitCar();
    state.cash = 100;
    state.health = PLAYER.health;
    state.elapsed = 0;
    missions.loadState({ index: 0 });
    teleportPlayer(0, 22, 0);
  }

  function resetAfterBusted() {
    police.clear();
    state.health = PLAYER.health;
    state.cash = Math.max(0, state.cash - 100);
    if (state.inCar) exitCar();
    player.state.x = 0;
    player.state.z = 22;
    player.state.heading = 0;
    player.sync();
    renderer.snapBehind(0);
  }

  function saveGame() {
    return {
      version: 1,
      cash: state.cash,
      health: state.health,
      x: player.state.x,
      z: player.state.z,
      heading: player.state.heading,
      mission: missions.saveState(),
      elapsed: state.elapsed,
    };
  }

  function loadGame(saved) {
    if (!saved) return false;
    state.cash = saved.cash ?? 100;
    state.health = saved.health ?? PLAYER.health;
    player.state.x = saved.x ?? 0;
    player.state.z = saved.z ?? 22;
    player.state.heading = saved.heading ?? 0;
    state.elapsed = saved.elapsed ?? 0;
    missions.loadState(saved.mission);
    player.sync();
    renderer.snapBehind(player.state.heading);
    return true;
  }

  /**
   * Staging helpers for the ?shot= scenes (and the start screen's Continue):
   * put the player somewhere, or put them straight into a car.
   */
  function teleportPlayer(x, z, heading) {
    if (state.inCar) exitCar();
    player.state.x = clampToCity(x);
    player.state.z = clampToCity(z);
    player.state.heading = heading;
    player.sync();
    renderer.snapBehind(heading);
  }

  return {
    state,
    player,
    traffic,
    police,
    missions,
    combat,
    parked,
    city,
    collidePoint,
    step,
    reset,
    enterCar,
    exitCar,
    teleportPlayer,
    damagePlayer,
    resetAfterBusted,
    saveGame,
    loadGame,
  };
}
