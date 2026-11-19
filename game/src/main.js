// Boot and the one loop: input is read every frame, the world advances in
// fixed 1/60 s steps, and the renderer paints what is there. The game moves
// between four screens: title, play, paused and busted/wasted.
//
// ?seed=N fixes the city and the traffic. ?shot=cover|drive|chase|street (with
// &seed=N) stages that scene instead of running the loop, renders it a few
// times and sets window.__shotReady for a screenshot.
import { SAVE_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_BUSTED, EVENT_CRIME, EVENT_MISSION, EVENT_PUNCH, EVENT_SHOT, EVENT_WASTED } from './world.js';
import { ACTION_CONFIRM, ACTION_ENTER_CAR, ACTION_PAUSE, ACTION_PUNCH, ACTION_RELOAD, ACTION_SAVE, createInput } from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { createHud } from './hud.js';
import { createAudio } from './audio.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const hud = createHud();
const audio = createAudio();
const renderer = createRenderer(canvas);
const world = createWorld(createRandom(seed), renderer);

const titleScreen = document.getElementById('screen-title');
const pausedScreen = document.getElementById('screen-paused');
const overScreen = document.getElementById('screen-over');
const overTitle = document.getElementById('over-title');
const overText = document.getElementById('over-text');
const continueButton = document.getElementById('btn-continue');

function showScreen(name) {
  titleScreen.classList.toggle('hidden', name !== SCREEN_TITLE);
  pausedScreen.classList.toggle('hidden', name !== SCREEN_PAUSED);
  overScreen.classList.toggle('hidden', name !== SCREEN_OVER);
}

function readSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeSave() {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(world.saveGame()));
    return true;
  } catch {
    return false;
  }
}

function runShot(name) {
  stageShot(name, world);
  showScreen(SCREEN_PLAY); // hide the title card so the city is visible
  // Let the camera settle behind the action, then paint a few frames.
  let painted = 0;
  function paint() {
    const target = world.state.inCar && world.state.car ? world.state.car : world.player.state;
    renderer.updateCamera(target, world.state.inCar, 0.5);
    renderer.render();
    updateHud(STEP);
    painted += 1;
    if (painted < 4) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

/** Push the live state into the HUD panels and the minimap. */
function updateHud(dt) {
  const p = world.player.state;
  const inCar = world.state.inCar;
  const car = world.state.car;
  const focus = inCar && car ? car : p;
  hud.update({
    cash: world.state.cash,
    health: world.state.health,
    wanted: world.police.wanted,
    objective: world.missions.objectiveText(p.x, p.z, inCar),
    speed: world.state.speed,
    ammo: world.combat.ammo,
    reloading: world.combat.reloading,
    inCar,
    player: {
      x: focus.x,
      z: focus.z,
      headingX: Math.cos(focus.heading),
      headingZ: Math.sin(focus.heading),
    },
    mission: world.missions.target(),
    trafficCars: world.traffic.cars.filter((c) => c.driver !== null && c.driver !== 'player'),
    policeCars: world.police.cars,
  }, dt);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let accumulator = 0;
  let last = performance.now();
  let saved = readSave();
  if (saved) continueButton.hidden = false;

  function announce(message) {
    status.textContent = message;
  }

  function startGame(fresh) {
    if (fresh) world.reset();
    screen = SCREEN_PLAY;
    showScreen(SCREEN_PLAY);
    audio.unlock();
    announce('Playing. Follow the gold marker.');
  }

  function loadAndStart() {
    saved = readSave();
    if (saved) world.loadGame(saved);
    startGame(false);
    hud.showMessage('Saved game loaded. Welcome back to Solar Bay.');
  }

  function endGame(busted) {
    screen = SCREEN_OVER;
    overTitle.textContent = busted ? 'Busted!' : 'Wasted!';
    overText.textContent = busted
      ? 'The Solar Bay police caught up with you. $100 bail, and the heat is off — for now.'
      : 'Jax went down in the streets of Solar Bay. The city keeps moving without you.';
    showScreen(SCREEN_OVER);
    audio.busted();
    announce(overTitle.textContent);
  }

  function handleEvents(events) {
    if (events & EVENT_SHOT) audio.gunshot();
    if (events & EVENT_PUNCH) audio.punch();
    if (events & EVENT_CRIME) hud.showMessage('The cops saw that! Wanted level up.', 2.5);
    if (events & EVENT_MISSION) {
      audio.missionDone();
      audio.pickup();
      const banner = world.missions.banner();
      hud.showMessage(banner || 'Job done!', 3);
      writeSave();
    }
    if (events & EVENT_BUSTED) {
      world.resetAfterBusted();
      endGame(true);
    } else if (events & EVENT_WASTED) {
      world.resetAfterBusted();
      endGame(false);
    }
  }

  /**
   * Screen transitions and one-shot actions, run every frame (not only while
   * the world steps): a paused or finished game still has to hear P and Space.
   * Returns the world-step flags for this frame, if the game is playing.
   */
  function handleActions() {
    const actions = input.takeActions();
    const flags = { enterCar: false, punch: false, reload: false };
    if (screen === SCREEN_TITLE) {
      if (actions & ACTION_CONFIRM) startGame(true);
      return flags;
    }
    if (screen === SCREEN_OVER) {
      if (actions & ACTION_CONFIRM) {
        screen = SCREEN_TITLE;
        showScreen(SCREEN_TITLE);
      }
      return flags;
    }
    if (actions & ACTION_PAUSE) {
      if (screen === SCREEN_PLAY) {
        screen = SCREEN_PAUSED;
        showScreen(SCREEN_PAUSED);
        announce('Paused.');
        return flags;
      }
      if (screen === SCREEN_PAUSED) {
        screen = SCREEN_PLAY;
        showScreen(SCREEN_PLAY);
        announce('Playing.');
      }
    }
    if (screen === SCREEN_PAUSED) {
      if (actions & ACTION_SAVE) {
        if (writeSave()) hud.showMessage('Game saved.', 2);
      }
      return flags;
    }
    // Playing: translate the raw action bits into the world's flags.
    flags.enterCar = Boolean(actions & ACTION_ENTER_CAR);
    flags.punch = Boolean(actions & ACTION_PUNCH);
    flags.reload = Boolean(actions & ACTION_RELOAD);
    return flags;
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    const flags = handleActions();
    if (screen === SCREEN_PLAY) {
      // The one-shot flags apply to the first sub-step only: a second sub-step
      // in the same frame must not enter and then leave the car again.
      let firstStep = true;
      while (accumulator >= STEP && screen === SCREEN_PLAY) {
        const stepFlags = firstStep ? flags : { enterCar: false, punch: false, reload: false };
        firstStep = false;
        handleEvents(world.step(STEP, input, stepFlags));
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    // The world only advances while playing; the camera still follows.
    const target = world.state.inCar && world.state.car ? world.state.car : world.player.state;
    renderer.updateCamera(target, world.state.inCar, STEP);
    renderer.render();
    updateHud(STEP);
    audio.setEngine(world.state.inCar ? Math.abs(world.state.speed) / 34 : 0);
    audio.setSiren(world.police.sirenLevel);
  }

  document.getElementById('btn-start').addEventListener('click', () => startGame(true));
  document.getElementById('btn-continue').addEventListener('click', loadAndStart);
  document.getElementById('btn-resume').addEventListener('click', () => {
    screen = SCREEN_PLAY;
    showScreen(SCREEN_PLAY);
  });
  document.getElementById('btn-save').addEventListener('click', () => {
    if (writeSave()) hud.showMessage('Game saved.', 2);
  });
  document.getElementById('btn-again').addEventListener('click', () => {
    screen = SCREEN_TITLE;
    showScreen(SCREEN_TITLE);
  });
  window.addEventListener('keydown', (event) => {
    if (event.code === 'KeyM') audio.toggleMute();
    if (event.code === 'KeyC' && screen === SCREEN_PLAY) {
      if (writeSave()) hud.showMessage('Game saved.', 2);
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      showScreen(SCREEN_PAUSED);
      announce('Paused.');
    }
  });

  announce('Solar Bay Heat. Press Space or click Start to play.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
