// The Three.js stage: renderer, sun, sky and the third-person camera. Two
// camera modes — a follow camera on foot that the mouse orbits, and a chase
// camera behind the car that swings with its heading.
import * as THREE from 'three';
import { PALETTE } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PALETTE.sky);
  scene.fog = new THREE.Fog(PALETTE.sky, 180, 520);

  const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 900);

  const sun = new THREE.DirectionalLight(PALETTE.sun, 2.6);
  sun.position.set(120, 180, 60);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -200;
  sun.shadow.camera.right = 200;
  sun.shadow.camera.top = 200;
  sun.shadow.camera.bottom = -200;
  sun.shadow.camera.far = 600;
  sun.shadow.bias = -0.0004;
  scene.add(sun);
  scene.add(new THREE.HemisphereLight(0xbfe3ff, 0x8a7a5a, 0.9));

  // A few soft clouds drifting high above the city.
  const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
  const clouds = [];
  for (let i = 0; i < 10; i += 1) {
    const cloud = new THREE.Group();
    const puffs = 3 + (i % 3);
    for (let p = 0; p < puffs; p += 1) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(6 + (p % 3) * 3, 8, 6), cloudMat);
      puff.position.set(p * 8 - puffs * 4, (p % 2) * 2, (p % 3) * 3);
      puff.scale.y = 0.45;
      cloud.add(puff);
    }
    cloud.position.set(-160 + i * 38, 90 + (i % 4) * 8, -140 + ((i * 53) % 280));
    scene.add(cloud);
    clouds.push(cloud);
  }

  let camYaw = 0;
  let camPitch = 0.32;
  let camDistance = 9;

  function resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  resize();
  window.addEventListener('resize', resize);

  /**
   * Position the camera. On foot it orbits the player at `camYaw`/`camPitch`;
   * in a car it chases behind the car's heading. `dt` smooths the swing.
   */
  function updateCamera(target, inCar, dt) {
    const yaw = inCar ? target.heading : camYaw;
    const pitch = inCar ? 0.24 : camPitch;
    const distance = inCar ? 11 : camDistance;
    const height = inCar ? 4.2 : 2.2;
    const tx = target.x;
    const tz = target.z;
    const desiredX = tx - Math.cos(yaw) * Math.cos(pitch) * distance;
    const desiredZ = tz - Math.sin(yaw) * Math.cos(pitch) * distance;
    const desiredY = height + Math.sin(pitch) * distance;
    const blend = 1 - Math.exp(-dt * (inCar ? 5 : 10));
    camera.position.x += (desiredX - camera.position.x) * blend;
    camera.position.y += (desiredY - camera.position.y) * blend;
    camera.position.z += (desiredZ - camera.position.z) * blend;
    camera.lookAt(tx, 1.6, tz);
    if (inCar) camYaw = yaw;
  }

  function orbit(dx, dy) {
    camYaw -= dx * 0.005;
    camPitch = Math.max(0.08, Math.min(1.1, camPitch + dy * 0.003));
  }

  function snapBehind(heading) {
    camYaw = heading;
    camera.position.set(0, 0, 0);
  }

  function stepClouds(dt) {
    for (const cloud of clouds) {
      cloud.position.x += dt * 1.5;
      if (cloud.position.x > 220) cloud.position.x = -220;
    }
  }

  return {
    scene,
    camera,
    get camYaw() {
      return camYaw;
    },
    set camYaw(value) {
      camYaw = value;
    },
    resize,
    updateCamera,
    orbit,
    snapBehind,
    stepClouds,
    render() {
      renderer.render(scene, camera);
    },
  };
}
