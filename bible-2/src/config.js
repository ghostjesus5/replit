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
};

export const POWERUPS = {
  loavesMs: 10000,
  wineMs: 10000,
};

export const ENEMIES = {
  serpent: { hp: 3, speed: 55, score: 100, laser: 12 },
  imp: { hp: 2, speed: 110, score: 150, laser: 12, fireEveryMs: 1700, fireballSpeed: 360, bob: 36 },
  thorns: { hp: Infinity },
};

export const COLORS = {
  sky: 0x8fd3ff,
  gold: 0xffd447,
  pink: 0xf28cc6,
  ink: 0x1b1430,
  cream: 0xf6e7c1,
  red: 0xff3b30,
};

export const FONT = 'Georgia, "Times New Roman", serif';
