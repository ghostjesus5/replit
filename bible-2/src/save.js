// Per-device best runs. Storage can be blocked (private mode), so every call is guarded.
const KEY = 'bible2.best';

export function loadBest(levelId) {
  try {
    const all = JSON.parse(localStorage.getItem(KEY) || '{}');
    return all[levelId] || null;
  } catch {
    return null;
  }
}

export function saveBest(levelId, run) {
  try {
    const all = JSON.parse(localStorage.getItem(KEY) || '{}');
    const prev = all[levelId];
    if (!prev || run.timeMs < prev.timeMs) all[levelId] = run;
    localStorage.setItem(KEY, JSON.stringify(all));
    return all[levelId];
  } catch {
    return run;
  }
}

// Campaign progress: which levels are cleared, plus a playtest switch that unlocks everything.
const PROGRESS = 'bible2.progress';

function readProgress() {
  try {
    return JSON.parse(localStorage.getItem(PROGRESS) || '{}');
  } catch {
    return {};
  }
}

function writeProgress(p) {
  try {
    localStorage.setItem(PROGRESS, JSON.stringify(p));
  } catch {
    // storage blocked, progress just won't stick
  }
}

let memory = null; // fallback when storage is blocked

export function getProgress() {
  const p = memory || readProgress();
  return { cleared: p.cleared || [], unlockAll: !!p.unlockAll };
}

export function markCleared(levelId) {
  const p = getProgress();
  if (!p.cleared.includes(levelId)) p.cleared.push(levelId);
  memory = p;
  writeProgress(p);
}

export function setUnlockAll(on) {
  const p = getProgress();
  p.unlockAll = on;
  memory = p;
  writeProgress(p);
}
