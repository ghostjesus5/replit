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
