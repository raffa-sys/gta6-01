// The HUD: DOM panels over the 3D view (cash, health, wanted stars, mission
// objective, speed, messages) plus a 2D canvas minimap in the corner showing
// the player, the police, the traffic and the mission marker.
import { CITY, FONT } from './config.js';

const STAR_ON = '★';
const STAR_OFF = '☆';

export function createHud() {
  const root = document.getElementById('hud');
  const cashEl = document.getElementById('hud-cash');
  const healthFill = document.getElementById('hud-health-fill');
  const healthText = document.getElementById('hud-health-text');
  const wantedEl = document.getElementById('hud-wanted');
  const objectiveEl = document.getElementById('hud-objective');
  const speedEl = document.getElementById('hud-speed');
  const messageEl = document.getElementById('hud-message');
  const crosshair = document.getElementById('hud-crosshair');
  const ammoEl = document.getElementById('hud-ammo');
  const mapCanvas = document.getElementById('hud-minimap');
  const mapCtx = mapCanvas.getContext('2d');
  let messageTimer = 0;

  function showMessage(text, seconds = 3) {
    messageEl.textContent = text;
    messageEl.style.opacity = '1';
    messageTimer = seconds;
  }

  /** Draw the minimap: roads, sea, mission marker, traffic, police, player. */
  function drawMinimap(view) {
    const size = mapCanvas.width;
    const half = CITY.half + 20;
    const scale = size / (half * 2);
    const toMap = (x, z) => [(x + half) * scale, (z + half) * scale];
    mapCtx.fillStyle = 'rgba(20, 28, 34, 0.92)';
    mapCtx.fillRect(0, 0, size, size);
    // Sea to the west.
    const [seaX] = toMap(-CITY.half - 20, 0);
    mapCtx.fillStyle = '#2e7fa8';
    mapCtx.fillRect(0, 0, Math.max(0, seaX), size);
    // Roads.
    mapCtx.strokeStyle = '#5a6068';
    mapCtx.lineWidth = 3;
    for (let c = -CITY.half; c <= CITY.half; c += CITY.blockSpan) {
      const [x] = toMap(c, 0);
      const [, z] = toMap(0, c);
      mapCtx.beginPath();
      mapCtx.moveTo(x, 0);
      mapCtx.lineTo(x, size);
      mapCtx.stroke();
      mapCtx.beginPath();
      mapCtx.moveTo(0, z);
      mapCtx.lineTo(size, z);
      mapCtx.stroke();
    }
    // Mission marker.
    if (view.mission) {
      const [mx, mz] = toMap(view.mission.x, view.mission.z);
      mapCtx.fillStyle = '#ffd23f';
      mapCtx.beginPath();
      mapCtx.arc(mx, mz, 5, 0, Math.PI * 2);
      mapCtx.fill();
      mapCtx.strokeStyle = '#ffd23f';
      mapCtx.lineWidth = 1.5;
      mapCtx.beginPath();
      mapCtx.arc(mx, mz, 8, 0, Math.PI * 2);
      mapCtx.stroke();
    }
    // Traffic cars.
    mapCtx.fillStyle = '#c8c8c8';
    for (const car of view.trafficCars) {
      const [cx, cz] = toMap(car.x, car.z);
      mapCtx.fillRect(cx - 1.5, cz - 1.5, 3, 3);
    }
    // Police cars.
    mapCtx.fillStyle = '#ff4040';
    for (const car of view.policeCars) {
      const [cx, cz] = toMap(car.x, car.z);
      mapCtx.beginPath();
      mapCtx.arc(cx, cz, 3.5, 0, Math.PI * 2);
      mapCtx.fill();
    }
    // Player arrow, rotated to the heading.
    const [px, pz] = toMap(view.player.x, view.player.z);
    mapCtx.save();
    mapCtx.translate(px, pz);
    mapCtx.rotate(Math.atan2(view.player.headingZ, view.player.headingX));
    mapCtx.fillStyle = '#ffffff';
    mapCtx.beginPath();
    mapCtx.moveTo(7, 0);
    mapCtx.lineTo(-5, -4.5);
    mapCtx.lineTo(-5, 4.5);
    mapCtx.closePath();
    mapCtx.fill();
    mapCtx.restore();
  }

  /**
   * Refresh every HUD element from the live state. `view` carries the player,
   * cash, health, wanted stars, objective text, speed, ammo, the minimap
   * actors and whether the player is driving.
   */
  function update(view, dt) {
    cashEl.textContent = `$${view.cash.toLocaleString('en-US')}`;
    const health = Math.max(0, Math.round(view.health));
    healthFill.style.width = `${health}%`;
    healthFill.style.background = health > 50 ? '#2ecc71' : health > 25 ? '#f39c12' : '#e74c3c';
    healthText.textContent = `${health}`;
    let stars = '';
    for (let i = 0; i < 5; i += 1) stars += i < view.wanted ? STAR_ON : STAR_OFF;
    wantedEl.textContent = stars;
    wantedEl.style.color = view.wanted > 0 ? '#ff5040' : '#8b93a3';
    objectiveEl.textContent = view.objective;
    if (view.inCar) {
      speedEl.textContent = `${Math.round(Math.abs(view.speed) * 3.6)} km/h`;
      speedEl.style.opacity = '1';
    } else {
      speedEl.style.opacity = '0';
    }
    ammoEl.textContent = view.reloading ? 'RELOADING…' : `AMMO ${view.ammo}/12`;
    crosshair.style.opacity = view.inCar ? '0' : '1';
    if (messageTimer > 0) {
      messageTimer -= dt;
      if (messageTimer <= 0) messageEl.style.opacity = '0';
    }
    drawMinimap(view);
  }

  return { update, showMessage };
}
