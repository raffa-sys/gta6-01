# Solar Bay Heat

[![gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![rank](https://make.fun/badge/gta6-01/raffa-sys/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01)
[![reward](https://make.fun/badge/gta6-01/raffa-sys/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01)

An open-world crime game in the browser. You are **Jax Marlow**, a driver-for-hire
in the sun-soaked fictional city of **Solar Bay**. Rico has three jobs for you:
a pickup at the docks, a hot car for the plaza, and a getaway with the whole
police force on your tail. Everything — the city, the characters, the cars, the
story, the art, the sounds and the music — is original. Nothing is taken from
any commercial game.

## Play it

```sh
node serve.ts
```

Then open <http://localhost:8080> in desktop Chrome. No build step, no network:
the game is plain static files under `game/`, with Three.js vendored as a
single `game/vendor/three.min.js`. All textures are drawn on canvas at runtime
and all sound is synthesised with WebAudio.

## How to play

| Key / mouse | What it does |
| --- | --- |
| **W A S D** | Walk / run (hold **Shift** to run) / drive |
| **E** | Steal the nearest car / get out of the car |
| **Click** | Shoot the pistol |
| **F** | Punch |
| **R** | Reload |
| **C** | Save the game (localStorage) |
| **P** / **Esc** | Pause |
| **M** | Mute |
| **Drag mouse** | Look around (third-person camera) |

## What's in the city

- **A city to explore** on foot and by car: a grid of avenues, buildings,
  sidewalks, palm trees, lamps, a beach and the sea, all built procedurally.
- **Traffic and pedestrians**: cars looping the avenues, people strolling the
  sidewalks — and they flee when a shot is fired.
- **Cars to steal and drive**: any parked or traffic car is yours with **E**,
  with arcade driving, a chase camera and a speedometer.
- **A wanted level and police who respond**: crimes raise up to five stars;
  police cruisers spawn, chase, ram and try to bust you. Lay low and the heat
  cools off.
- **Missions and a story**: three jobs for Rico, played in order, with the
  objective and distance on the HUD and a gold beacon in the world and on the
  minimap. Finish all three and the city is yours in free roam.
- **Combat**: fists up close, a pistol with a magazine and reload at range.
- **HUD and minimap**: cash, health, wanted stars, mission objective, speed,
  ammo, and a live 2D minimap showing you, the police, the traffic and the
  mission marker.
- **Start screen, pause, save/load**: continue a saved game from the title
  screen; the game auto-saves after every completed job.
- **Sound**: a synthesised engine hum, two-tone sirens, gunshots, punches,
  mission stings and a bass-and-hats music loop — no audio files.

## Screenshots

The four screenshots in `screenshots/` are real renders of the game, staged
deterministically with `?shot=cover|drive|chase|street&seed=7` — the cover
shows the chase at four wanted stars with the mission on the HUD.

## Structure

```
game/
  index.html            the page, HUD and menus
  vendor/three.min.js   Three.js (vendored, minified)
  src/
    config.js           tuning numbers and colours
    random.js           seeded random numbers
    input.js            keyboard and mouse
    audio.js            synthesised WebAudio sound
    city.js             the Solar Bay city mesh
    vehicles.js         car models and driving physics
    traffic.js          traffic cars and pedestrians
    police.js           wanted level and police pursuit
    missions.js         Rico's three jobs
    combat.js           punching and shooting
    player.js           the player on foot
    hud.js              HUD panels and the minimap
    render.js           Three.js stage and cameras
    world.js            the rules that tie it all together
    shots.js            deterministic screenshot scenes
    main.js             boot, the game loop, screens, save/load
```

## License

MIT — see `LICENSE`.
