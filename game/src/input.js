// Keyboard and mouse input. Held keys give movement and driving; one-shot
// presses (confirm, pause, enter car, punch, reload, save) are queued as bit
// flags and taken once by the loop, so a press between two frames is never
// lost and never counted twice. Dragging the mouse orbits the camera.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_ENTER_CAR = 4;
export const ACTION_PUNCH = 8;
export const ACTION_RELOAD = 16;
export const ACTION_SAVE = 32;

const FORWARD = new Set(['KeyW', 'ArrowUp']);
const BACK = new Set(['KeyS', 'ArrowDown']);
const LEFT = new Set(['KeyA', 'ArrowLeft']);
const RIGHT = new Set(['KeyD', 'ArrowRight']);
const RUN = new Set(['ShiftLeft', 'ShiftRight']);
const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const ENTER_CAR = new Set(['KeyE']);
const PUNCH = new Set(['KeyF']);
const RELOAD = new Set(['KeyR']);
const SAVE = new Set(['KeyC']);

export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  let mouseDown = false;
  let mouseDeltaX = 0;
  let mouseDeltaY = 0;
  let lastX = 0;
  let lastY = 0;
  // How far the pointer moved during the current press: a drag orbits the
  // camera, a near-still click fires the pistol. Kept apart from the deltas
  // takeMouseDelta() consumes, so a drag never becomes a shot by accident.
  let dragTotal = 0;

  function press(code) {
    if (CONFIRM.has(code)) actions |= ACTION_CONFIRM;
    else if (PAUSE.has(code)) actions |= ACTION_PAUSE;
    else if (ENTER_CAR.has(code)) actions |= ACTION_ENTER_CAR;
    else if (PUNCH.has(code)) actions |= ACTION_PUNCH;
    else if (RELOAD.has(code)) actions |= ACTION_RELOAD;
    else if (SAVE.has(code)) actions |= ACTION_SAVE;
  }

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    keys.add(event.code);
    press(event.code);
    if (FORWARD.has(event.code) || BACK.has(event.code) || LEFT.has(event.code)
      || RIGHT.has(event.code) || CONFIRM.has(event.code) || PAUSE.has(event.code)
      || event.code === 'Space') event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    keys.delete(event.code);
  });
  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('pointerdown', (event) => {
    mouseDown = true;
    dragTotal = 0;
    lastX = event.clientX;
    lastY = event.clientY;
    actions |= ACTION_CONFIRM;
  });
  window.addEventListener('pointermove', (event) => {
    if (!mouseDown) return;
    const dx = event.clientX - lastX;
    const dy = event.clientY - lastY;
    mouseDeltaX += dx;
    mouseDeltaY += dy;
    dragTotal += Math.abs(dx) + Math.abs(dy);
    lastX = event.clientX;
    lastY = event.clientY;
  });
  window.addEventListener('pointerup', () => {
    mouseDown = false;
  });
  // Clicking fires the pistol; dragging orbits the camera instead.
  canvas.addEventListener('click', () => {
    if (dragTotal < 8) {
      // A plain click is a shot; the world reads it through takeShot().
      shotQueued = true;
    }
    dragTotal = 0;
  });

  let shotQueued = false;

  function has(codeSet) {
    for (const code of codeSet) if (keys.has(code)) return true;
    return false;
  }

  return {
    /** Forward/back/strafe as -1, 0 or 1 each, plus run held. */
    move() {
      return {
        forward: (has(FORWARD) ? 1 : 0) - (has(BACK) ? 1 : 0),
        strafe: (has(RIGHT) ? 1 : 0) - (has(LEFT) ? 1 : 0),
        run: has(RUN),
      };
    },
    /** Driving: throttle -1..1 and steering -1..1. */
    drive() {
      return {
        throttle: (has(FORWARD) ? 1 : 0) - (has(BACK) ? 1 : 0),
        steer: (has(LEFT) ? 1 : 0) - (has(RIGHT) ? 1 : 0),
      };
    },
    /** Camera orbit deltas since the last call, in pixels. */
    takeMouseDelta() {
      const delta = { x: mouseDeltaX, y: mouseDeltaY };
      mouseDeltaX = 0;
      mouseDeltaY = 0;
      return delta;
    },
    /** True once when the player clicked to shoot. */
    takeShot() {
      const shot = shotQueued;
      shotQueued = false;
      return shot;
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
