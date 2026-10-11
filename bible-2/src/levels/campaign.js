import EDEN from './eden.js';
import EGYPT from './egypt.js';
import REDSEA from './redsea.js';
import JERICHO from './jericho.js';
import BABEL from './babel.js';
import REVELATION from './revelation.js';
import { MORMON_WORLDS } from './mormon.js';

export const WORLDS = [
  { id: 'eden', name: 'EDEN', levels: EDEN },
  { id: 'egypt', name: 'EGYPT', levels: EGYPT },
  { id: 'redsea', name: 'THE RED SEA', levels: REDSEA },
  { id: 'jericho', name: 'JERICHO', levels: JERICHO },
  { id: 'babel', name: 'BABEL', levels: BABEL },
  { id: 'revelation', name: 'REVELATION', levels: REVELATION },
];

// Two campaigns share one engine. Each world: { id, name, levels, intro?: [lines] }
export const CAMPAIGNS = {
  bible: { id: 'bible', title: 'BIBLE 2', subtitle: 'THE NEWEST TESTAMENT', worlds: WORLDS },
  mormon: { id: 'mormon', title: 'ANOTHER TESTAMENT', subtitle: 'THE BOOK OF MORMON: UNABRIDGED, UNVERIFIED', worlds: MORMON_WORLDS },
};

// every level knows its theme (from its world, unless it set one) and its campaign
for (const c of Object.values(CAMPAIGNS)) {
  for (const w of c.worlds) {
    for (const l of w.levels) {
      l.theme = l.theme || w.themeId || w.id;
      l.campaign = c.id;
    }
  }
}

export const campaignLevels = (cid) => CAMPAIGNS[cid].worlds.flatMap((w) => w.levels);
export const ALL_LEVELS = campaignLevels('bible');
const EVERY_LEVEL = Object.keys(CAMPAIGNS).flatMap(campaignLevels);

export function findLevel(id) {
  return EVERY_LEVEL.find((l) => l.id === id) || ALL_LEVELS[0];
}

export function worldOf(levelId) {
  for (const c of Object.values(CAMPAIGNS)) for (const w of c.worlds) if (w.levels.some((l) => l.id === levelId)) return w;
  return null;
}

// next level within the same campaign
export function nextLevel(id) {
  const lvl = findLevel(id);
  const list = campaignLevels(lvl.campaign || 'bible');
  const i = list.findIndex((l) => l.id === id);
  return i >= 0 && i < list.length - 1 ? list[i + 1] : null;
}
