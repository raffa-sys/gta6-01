// Solar Bay Heat — the hand-in program for the make.fun gta6-01 bounty.
// Node 22, standard library only. It takes this repository's game/ folder
// (plain static files: an index.html that opens in desktop Chrome and plays
// with no network request) and screenshots/ folder, copies both into the
// output directory, and writes the dossier.json the judge reads, using the
// vendored make.fun library. Run it locally with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output; inside the
// grader it is unset and /output is used. Run it twice: both runs must write
// the same bytes.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The scorer's caps, from the kit's reference/gate.json: the dossier text is
// capped, and the rest refuse an entry the scorer would refuse (more than 4
// screenshots or one over 256 KiB; game/ over 993 files or 48 MiB in all, or
// a path under game/ over 1000 bytes). game/ counts beside /output's own
// 1000-entry cap, which its screenshots/ and dossier.json share.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
