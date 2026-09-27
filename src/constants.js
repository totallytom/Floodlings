export const LOW_MOVES_THRESHOLD = 5;

// Tile size on a phone is governed almost entirely by COLUMN count - the screen
// is much taller than it is wide, so width is the binding constraint on tile
// size regardless of how many rows there are. Keep cols low enough that each
// tile is comfortably legible/tappable; ROW_STRETCH then adds extra rows to use
// the leftover vertical space without shrinking the tiles (rows only starts
// shrinking tile size once it's stretched enough to make height the binding
// constraint instead of width).
const ROW_STRETCH = 1.75;

const LEVEL_BANDS = [
  { minLevel: 1, maxLevel: 3, cols: 8, numTypes: 4, moves: 20, baseTarget: 1500 },
  { minLevel: 4, maxLevel: 6, cols: 8, numTypes: 5, moves: 22, baseTarget: 2500 },
  { minLevel: 7, maxLevel: 9, cols: 8, numTypes: 5, moves: 24, baseTarget: 3500 },
  { minLevel: 10, maxLevel: 12, cols: 8, numTypes: 6, moves: 26, baseTarget: 4500 },
  { minLevel: 13, maxLevel: 999, cols: 8, numTypes: 6, moves: 28, baseTarget: 5500 },
];

export function getLevelConfig(level) {
  const band = LEVEL_BANDS.find(b => level >= b.minLevel && level <= b.maxLevel)
    ?? LEVEL_BANDS[LEVEL_BANDS.length - 1];
  const stepsIntoBand = level - band.minLevel;
  const targetScore = Math.round(band.baseTarget * (1 + stepsIntoBand * 0.15));
  const cols = band.cols;
  const rows = Math.round(cols * ROW_STRETCH);
  return { rows, cols, numTypes: band.numTypes, moves: band.moves, targetScore };
}

// Free Mode: a fixed timed session instead of move-limited objective levels.
export const FREE_MODE_SECONDS = 210; // 3:30
export const FREE_MODE_URGENT_THRESHOLD = 15;

export function getFreeModeConfig() {
  const cols = 8; // same column count Levels uses - Board.js's width-bound sizing applies identically
  return { cols, rows: Math.round(cols * ROW_STRETCH), numTypes: 6 };
}

// Zen Mode: same board shape as Free Mode, but no clock and no fail state - kept
// as its own function (rather than reusing getFreeModeConfig directly) so the two
// can diverge later without one silently dragging the other along.
export function getZenModeConfig() {
  const cols = 8;
  return { cols, rows: Math.round(cols * ROW_STRETCH), numTypes: 6 };
}

// Species Rescue: same move-limited level structure as Levels, but the objective
// is "rescue N of a specific animal" instead of a score target. targetType cycles
// through that band's animal types by level number, so replaying the same level
// always asks for the same species (rather than re-rolling on every attempt).
const RESCUE_LEVEL_BANDS = [
  { minLevel: 1, maxLevel: 3, cols: 8, numTypes: 4, moves: 18, baseTarget: 12 },
  { minLevel: 4, maxLevel: 6, cols: 8, numTypes: 5, moves: 20, baseTarget: 16 },
  { minLevel: 7, maxLevel: 9, cols: 8, numTypes: 5, moves: 22, baseTarget: 20 },
  { minLevel: 10, maxLevel: 12, cols: 8, numTypes: 6, moves: 24, baseTarget: 24 },
  { minLevel: 13, maxLevel: 999, cols: 8, numTypes: 6, moves: 26, baseTarget: 28 },
];

export function getRescueLevelConfig(level) {
  const band = RESCUE_LEVEL_BANDS.find(b => level >= b.minLevel && level <= b.maxLevel)
    ?? RESCUE_LEVEL_BANDS[RESCUE_LEVEL_BANDS.length - 1];
  const stepsIntoBand = level - band.minLevel;
  const targetCount = Math.round(band.baseTarget * (1 + stepsIntoBand * 0.2));
  const cols = band.cols;
  const rows = Math.round(cols * ROW_STRETCH);
  const targetType = (level - 1) % band.numTypes;
  return { rows, cols, numTypes: band.numTypes, moves: band.moves, targetType, targetCount };
}

export function starsForScore(levelScore, targetScore) {
  if (levelScore >= targetScore * 2) return 3;
  if (levelScore >= targetScore * 1.5) return 2;
  return 1;
}

// index 0 = no cascade, 1/2/3 = increasing tiers - shared between the HUD display
// and the VoiceOver announcement fired from useGame.
export const COMBO_LABELS = ['', 'COMBO ×1.5', 'COMBO ×2.5!', 'COMBO ×4!!'];
