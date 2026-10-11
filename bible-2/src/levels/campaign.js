import EDEN from './eden.js';
import EGYPT from './egypt.js';
import REDSEA from './redsea.js';
import JERICHO from './jericho.js';
import BABEL from './babel.js';
import REVELATION from './revelation.js';

export const WORLDS = [
  { id: 'eden', name: 'EDEN', levels: EDEN },
  { id: 'egypt', name: 'EGYPT', levels: EGYPT },
  { id: 'redsea', name: 'THE RED SEA', levels: REDSEA },
  { id: 'jericho', name: 'JERICHO', levels: JERICHO },
  { id: 'babel', name: 'BABEL', levels: BABEL },
  { id: 'revelation', name: 'REVELATION', levels: REVELATION },
];

// every level knows its theme from the world it lives in
for (const w of WORLDS) for (const l of w.levels) l.theme = w.id;

export const ALL_LEVELS = WORLDS.flatMap((w) => w.levels);

export function findLevel(id) {
  return ALL_LEVELS.find((l) => l.id === id) || ALL_LEVELS[0];
}

export function nextLevel(id) {
  const i = ALL_LEVELS.findIndex((l) => l.id === id);
  return i >= 0 && i < ALL_LEVELS.length - 1 ? ALL_LEVELS[i + 1] : null;
}
