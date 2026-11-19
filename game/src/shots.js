// The screenshot scenes behind ?shot=cover|drive|chase|street. Each one stages
// the real game — the real city, traffic, police and missions — then drives
// or walks it forward with scripted input for a fixed number of steps, so the
// frame is what a short game really looks like and the same seed always gives
// the same frame. The main loop then keeps rendering it for the screenshot.
import { STEP } from './config.js';

function scriptedInput(drive) {
  return {
    move() {
      return { forward: drive ? 0 : 1, strafe: 0, run: false };
    },
    drive() {
      return { throttle: drive ? 1 : 0, steer: 0 };
    },
    takeMouseDelta() {
      return { x: 0, y: 0 };
    },
    takeShot() {
      return false;
    },
  };
}

const NO_ACTIONS = { enterCar: false, punch: false, reload: false };

function runSteps(world, seconds, drive) {
  const input = scriptedInput(drive);
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    world.step(STEP, input, NO_ACTIONS);
  }
}

function placePoliceBehind(world, distance) {
  const car = world.state.car;
  const focus = world.state.inCar && car ? car : world.player.state;
  for (let i = 0; i < world.police.cars.length; i += 1) {
    const cop = world.police.cars[i];
    const behind = focus.heading + Math.PI + (i - 0.5) * 0.35;
    cop.x = focus.x + Math.cos(behind) * (distance + i * 6);
    cop.z = focus.z + Math.sin(behind) * (distance + i * 6);
    cop.heading = focus.heading;
    cop.speed = 20;
    cop.sync();
  }
  // One more cruiser stays ahead on the road, so the chase is visible in frame.
  const lead = world.police.cars[0];
  if (lead) {
    const ahead = focus.heading;
    lead.x = focus.x + Math.cos(ahead) * 45 - Math.sin(ahead) * 4;
    lead.z = focus.z + Math.sin(ahead) * 45 + Math.cos(ahead) * 4;
    lead.heading = focus.heading;
    lead.speed = 12;
    lead.sync();
  }
}

/**
 * Stage the named scene on `world` and return the camera target the shot
 * should frame. Any other name stages the cover.
 */
export function stageShot(name, world) {
  const scene = name;
  if (scene === 'street') {
    // On foot down the main avenue, mission marker ahead, pedestrians around.
    world.teleportPlayer(-30, 3, 0);
    runSteps(world, 3.0, false);
    return { drive: false };
  }
  if (scene === 'drive') {
    // Cruising down the main avenue in a stolen car, one star of heat.
    world.enterCar(world.parked[1]);
    world.police.addWanted(1);
    runSteps(world, 3.5, true);
    return { drive: true };
  }
  if (scene === 'chase') {
    // Full heat: four stars, police cars right on the bumper.
    world.enterCar(world.parked[2]);
    world.police.addWanted(4);
    runSteps(world, 2.0, true);
    placePoliceBehind(world, 12);
    runSteps(world, 1.0, true);
    return { drive: true };
  }
  // Cover: the whole game in one frame — stolen car on the avenue, three
  // stars, police closing in, traffic ahead, mission 1 on the HUD.
  world.enterCar(world.parked[0]);
  world.police.addWanted(3);
  runSteps(world, 3.0, true);
  placePoliceBehind(world, 16);
  runSteps(world, 1.2, true);
  return { drive: true };
}
