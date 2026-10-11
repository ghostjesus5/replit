// Every number that changes how the game feels lives here.
// Tune these first when a playtest says "too floaty", "too hard", etc.

export const TILE = 64;
export const WORLD_HEIGHT = 720;
export const GROUND_ROW = 9; // ground top sits at row 9 (y = 576)
export const GROUND_Y = GROUND_ROW * TILE;
// The camera shows the bottom VIEW_HEIGHT px of the 720px world. Smaller = everything bigger on screen.
export const VIEW_HEIGHT = 640;
export const VIEW_WIDTH = 1138;

const params = new URLSearchParams(window.location.search);

export const DEBUG = {
  physics: params.has('debug'), // draw hitboxes
  god: params.has('god'), // enemies can't hurt you (pits still can)
  autoplay: params.has('autoplay'), // bot jumps for you, used for level testing
};

export const PLAYER = {
  runSpeed: 400, // px/s, constant forward speed
  gravity: 2600,
  jumpVelocity: 960,
  doubleJumpVelocity: 860,
  coyoteMs: 110, // can still jump this long after running off a ledge
  jumpBufferMs: 130, // a tap this early before landing still counts
  hoverMaxFall: 90, // px/s fall speed cap while hovering
  hoverFuelMs: 1400, // hover time per airtime, refills on landing
  maxHearts: 3,
  hurtInvulnMs: 1300,
  respawnInvulnMs: 2500,
  respawnDescentMs: 900, // floating down after a resurrect, before running resumes
  stompBounce: 700,
  maxRiseY: 720 - VIEW_HEIGHT + 20, // keeps the hero from leaving the top of the screen
  cameraLead: 0.28, // hero sits at this fraction of screen width
};

export const GUNS = {
  fireIntervalMs: 75, // alternates barrels, so each gun fires every 150ms
  bulletSpeed: 1500,
  upperAngleDeg: 0,
  lowerAngleDeg: 6, // lower gun tilts down so it can hit ground enemies
  spreadAnglesDeg: [-9, 0, 9], // Loaves and Fishes
  damage: 1,
};

export const LASER = {
  meterMax: 100,
  perKill: 12,
  perHalo: 2,
  durationMs: 1100,
  bossDamage: 4, // per laser tick (about 9 ticks per blast)
};

export const POWERUPS = {
  loavesMs: 10000,
  wineMs: 10000,
  ghostMs: 8000, // Holy Ghost flight. Never ends over a pit, it waits for solid ground.
  ghostRise: 380, // px/s up while holding
  ghostSink: 240, // px/s down while not holding
  walkMs: 12000, // Walk on Water
  walkSpeedBoost: 1.3, // run speed multiplier while running on water
  partRangeTiles: 40, // Part the Sea parts every sea within this many tiles ahead
  trumpetRangeTiles: 30, // the trumpet drops every wall within this many tiles ahead
};

export const ENEMIES = {
  serpent: { hp: 3, speed: 55, w: 80, h: 30, ox: 10, oy: 12, gravity: true, tint: 0x3fa34d },
  imp: { hp: 2, speed: 110, w: 38, h: 34, ox: 13, oy: 12, bob: 36, fireEveryMs: 1700, shotSpeed: 360, tint: 0x6a3c84 },
  frog: { hp: 2, speed: 0, w: 40, h: 30, ox: 6, oy: 10, gravity: true, hopEveryMs: 1000, tint: 0x5fae3a },
  locust: { hp: 1, speed: 240, w: 30, h: 18, ox: 4, oy: 6, bob: 18, tint: 0x9a8a2a },
  chariot: { hp: 8, speed: 290, w: 104, h: 70, ox: 8, oy: 14, gravity: true, tint: 0xd9a330 },
  fish: { hp: 2, speed: 0, w: 46, h: 26, ox: 6, oy: 8, leapEveryMs: 1600, tint: 0x4da6ff },
  crab: { hp: 5, speed: 40, w: 56, h: 30, ox: 6, oy: 12, gravity: true, tint: 0xe2552f },
  golem: { hp: 12, speed: 30, w: 70, h: 104, ox: 13, oy: 8, gravity: true, tint: 0x9c7b5a },
  gargoyle: { hp: 3, speed: 45, w: 46, h: 40, ox: 9, oy: 10, bob: 20, fireEveryMs: 2000, shotSpeed: 330, tint: 0x7d7f8a },
  demon: { hp: 3, speed: 140, w: 44, h: 40, ox: 10, oy: 10, bob: 30, diveSpeed: 520, tint: 0xb3261e },
};

export const WALLS = { hpPerTile: 6 };

export const COLORS = {
  sky: 0x8fd3ff,
  gold: 0xffd447,
  pink: 0xf28cc6,
  ink: 0x1b1430,
  cream: 0xf6e7c1,
  red: 0xff3b30,
};

export const FONT = 'Georgia, "Times New Roman", serif';
