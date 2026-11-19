// A small seeded random number generator (mulberry32) so a ?seed=N run of the
// city, the traffic and the screenshot scenes always builds the same world.

export function createRandom(seed) {
  let state = seed >>> 0;
  return {
    /** A float in [0, 1). */
    next() {
      state = (state + 0x6d2b79f5) | 0;
      let t = Math.imul(state ^ (state >>> 15), 1 | state);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    /** An integer in [min, max). */
    int(min, max) {
      return min + Math.floor(this.next() * (max - min));
    },
    /** A float in [min, max). */
    range(min, max) {
      return min + this.next() * (max - min);
    },
    /** One element of `items`, uniformly. */
    pick(items) {
      return items[Math.floor(this.next() * items.length)];
    },
  };
}
