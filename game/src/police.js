// The wanted system: crimes raise stars, the stars decide how many police
// cars hunt the player, and the police chase, ram and — when the player is on
// foot and cornered — bust them. Lay low and the heat cools off on its own.
import { CITY, POLICE, WANTED } from './config.js';
import { createVehicle, driveStep } from './vehicles.js';

export function createPolice(random, scene, collide) {
  const cars = [];
  let wanted = 0;
  let quietTimer = 0;
  let bustTimer = 0;
  let sirenLevel = 0;

  function addWanted(stars) {
    wanted = Math.min(5, wanted + stars);
    quietTimer = 0;
  }

  function spawnCar(x, z) {
    const car = createVehicle(0xffffff, true);
    car.x = x;
    car.z = z;
    car.heading = Math.atan2(-z, -x);
    car.sync();
    scene.add(car.mesh.group);
    cars.push(car);
    return car;
  }

  /** Keep the number of pursuit cars matched to the wanted level. */
  function maintainCount(playerX, playerZ) {
    const wantedCount = wanted === 0 ? 0 : Math.min(POLICE.maxCars, Math.ceil(wanted / 2) + (wanted >= 3 ? 1 : 0));
    while (cars.length < wantedCount) {
      const angle = random.range(0, Math.PI * 2);
      const dist = random.range(35, 55);
      spawnCar(
        Math.max(-CITY.half, Math.min(CITY.half, playerX + Math.cos(angle) * dist)),
        Math.max(-CITY.half, Math.min(CITY.half, playerZ + Math.sin(angle) * dist)),
      );
    }
    while (cars.length > wantedCount) {
      const car = cars.pop();
      scene.remove(car.mesh.group);
    }
  }

  function step(dt, player, inCar) {
    if (wanted > 0) {
      quietTimer += dt;
      if (quietTimer > WANTED.decaySeconds) {
        wanted -= 1;
        quietTimer = 0;
      }
    }
    maintainCount(player.x, player.z);
    let nearest = Infinity;
    let busted = false;
    for (const car of cars) {
      // Steer toward the player, with a little wobble so the chase looks alive.
      const target = Math.atan2(player.z - car.z, player.x - car.x);
      let diff = target - car.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      const steer = Math.max(-1, Math.min(1, diff * 2.5));
      const throttle = Math.abs(diff) > 1.9 ? -0.5 : 1;
      const before = { x: car.x, z: car.z };
      driveStep(car, throttle, steer, dt, collide);
      // Flash the light bar: red and blue alternate every half second.
      const phase = Math.floor(performance.now() / 500) % 2 === 0;
      if (car.mesh.lightBar) {
        car.mesh.lightBar.children[0].material.color.setHex(phase ? 0xff2020 : 0x701010);
        car.mesh.lightBar.children[1].material.color.setHex(phase ? 0x102070 : 0x2040ff);
      }
      const dist = Math.hypot(car.x - player.x, car.z - player.z);
      nearest = Math.min(nearest, dist);
      // A ram: the police car shoves the player and the hit counts as a crime.
      const moved = Math.hypot(car.x - before.x, car.z - before.z);
      if (dist < 3.4 && moved > 0.01) {
        if (inCar) {
          player.car.speed *= 0.55;
        } else if (bustTimer <= 0) {
          bustTimer = 0.01;
        }
      }
      if (!inCar && dist < POLICE.bustRadius) {
        bustTimer += dt;
        if (bustTimer > POLICE.bustTime) busted = true;
      }
    }
    if (inCar || nearest > POLICE.bustRadius) {
      if (bustTimer > 0 && (inCar || nearest > POLICE.bustRadius + 2)) bustTimer = 0;
    }
    sirenLevel = cars.length > 0 ? Math.max(0, 1 - nearest / 90) : 0;
    return { busted, nearest };
  }

  function clear() {
    wanted = 0;
    quietTimer = 0;
    bustTimer = 0;
    while (cars.length > 0) {
      const car = cars.pop();
      scene.remove(car.mesh.group);
    }
  }

  return {
    cars,
    get wanted() {
      return wanted;
    },
    get bustTimer() {
      return bustTimer;
    },
    get sirenLevel() {
      return sirenLevel;
    },
    addWanted,
    step,
    clear,
  };
}
