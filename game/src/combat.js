// Combat: a punch for up close (F) and a pistol for distance (click).
// Shooting uses a ray from the camera; a hit ped or cop is a crime, peds
// flee, and the pistol needs a reload (R) after its magazine runs dry.
import * as THREE from 'three';

export const PUNCH_RANGE = 2.2;
export const PUNCH_DAMAGE = 25;
export const GUN_DAMAGE = 34;
export const MAG_SIZE = 12;

export function createCombat(scene, camera) {
  const raycaster = new THREE.Raycaster();
  const tracerMat = new THREE.LineBasicMaterial({ color: 0xffe9a8 });
  let tracer = null;
  let tracerTimer = 0;
  let ammo = MAG_SIZE;
  let reloading = 0;
  let punchCooldown = 0;

  function showTracer(from, to) {
    if (tracer) scene.remove(tracer);
    const geo = new THREE.BufferGeometry().setFromPoints([from, to]);
    tracer = new THREE.Line(geo, tracerMat);
    scene.add(tracer);
    tracerTimer = 0.08;
  }

  /**
   * Fire the pistol at the screen centre. `targets` is a list of { mesh, x, z,
   * kind } the ray can hit; returns the hit target or null. Ammo and the
   * reload timer are handled here.
   */
  function shoot(targets) {
    if (reloading > 0 || punchCooldown > 0) return null;
    if (ammo <= 0) {
      reloading = 1.2;
      return 'reload';
    }
    ammo -= 1;
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    raycaster.far = 120;
    const meshes = targets.map((t) => t.mesh);
    const hits = raycaster.intersectObjects(meshes, true);
    const origin = camera.position.clone();
    if (hits.length === 0) {
      const far = origin.clone().add(raycaster.ray.direction.clone().multiplyScalar(80));
      showTracer(origin, far);
      return 'miss';
    }
    const hit = hits[0];
    const end = hit.point.clone();
    showTracer(origin, end);
    // Walk up to the target's root group to find which target was hit.
    let node = hit.object;
    while (node.parent && !targets.some((t) => t.mesh === node)) node = node.parent;
    const target = targets.find((t) => t.mesh === node) ?? null;
    return target ?? 'miss';
  }

  function punch(playerX, playerZ, heading, targets) {
    if (punchCooldown > 0) return null;
    punchCooldown = 0.45;
    const fx = Math.cos(heading);
    const fz = Math.sin(heading);
    let best = null;
    let bestScore = PUNCH_RANGE;
    for (const target of targets) {
      const dx = target.x - playerX;
      const dz = target.z - playerZ;
      const dist = Math.hypot(dx, dz);
      if (dist > PUNCH_RANGE) continue;
      const facing = (dx * fx + dz * fz) / Math.max(dist, 0.01);
      if (facing < 0.3) continue;
      if (dist < bestScore) {
        bestScore = dist;
        best = target;
      }
    }
    return best;
  }

  function step(dt) {
    if (tracerTimer > 0) {
      tracerTimer -= dt;
      if (tracerTimer <= 0 && tracer) {
        scene.remove(tracer);
        tracer = null;
      }
    }
    if (reloading > 0) {
      reloading -= dt;
      if (reloading <= 0) ammo = MAG_SIZE;
    }
    if (punchCooldown > 0) punchCooldown -= dt;
  }

  function reload() {
    if (ammo < MAG_SIZE && reloading <= 0) reloading = 1.2;
  }

  return {
    shoot,
    punch,
    reload,
    step,
    get ammo() {
      return ammo;
    },
    get reloading() {
      return reloading > 0;
    },
  };
}
