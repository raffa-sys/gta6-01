// Solar Bay Heat — every tuning number and colour in one place.
// The city is a grid: roads every BLOCK_SPAN units, buildings fill the blocks
// between them. All distances are in metres, all speeds in metres per second.

export const STEP = 1 / 60;

export const CITY = {
  half: 180, // city spans -180..180 on x and z
  blockSpan: 44, // road centre to road centre
  roadWidth: 12,
  sidewalk: 3,
};

export const PLAYER = {
  walkSpeed: 7,
  runSpeed: 11,
  radius: 0.55,
  height: 1.8,
  health: 100,
};

export const CAR = {
  accel: 16,
  brake: 30,
  reverseAccel: 9,
  maxSpeed: 34,
  maxReverse: 10,
  steer: 1.9,
  length: 4.4,
  width: 2.0,
};

export const TRAFFIC = {
  cars: 12,
  peds: 14,
  carSpeed: 9,
  pedSpeed: 1.6,
};

export const POLICE = {
  maxCars: 4,
  chaseSpeed: 30,
  ramDamage: 8,
  bustRadius: 3.2,
  bustTime: 2.5,
};

export const WANTED = {
  decaySeconds: 25,
  stealCar: 1,
  hitPed: 1,
  hitCop: 2,
  shoot: 1,
};

export const PALETTE = {
  sky: 0x87bfe8,
  sun: 0xfff2cf,
  road: 0x3a3f46,
  sidewalk: 0x9a938a,
  sand: 0xe8d5a4,
  sea: 0x2e7fa8,
  grass: 0x5d8a4a,
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the save game is kept between visits (this browser only). */
export const SAVE_KEY = 'solar-bay-heat.save.v1';
