export const LOW_MOVES_THRESHOLD = 5;

// Moves granted by the rewarded-ad Continue after running out of moves.
export const CONTINUE_EXTRA_MOVES = 5;

// Tile size on a phone is governed almost entirely by COLUMN count - the screen
// is much taller than it is wide, so width is the binding constraint on tile
// size regardless of how many rows there are. Keep cols low enough that each
// tile is comfortably legible/tappable; ROW_STRETCH then adds extra rows to use
// the leftover vertical space without shrinking the tiles (rows only starts
// shrinking tile size once it's stretched enough to make height the binding
// constraint instead of width).
const ROW_STRETCH = 1.75;

// maxTarget caps each band's target. Without it, targets kept rising forever while
// the board, moves and scoring stop changing after level 13, so levels became
// mathematically out of reach (a simulated player won ~25% of level 25, ~0% of
// level 40). The caps keep the long tail hard but beatable. Tuned by simulation:
// run many games per level and aim for roughly 70-85% wins on normal levels.
const LEVEL_BANDS = [
  { minLevel: 1, maxLevel: 3, cols: 8, numTypes: 4, moves: 20, baseTarget: 1500 },
  { minLevel: 4, maxLevel: 6, cols: 8, numTypes: 5, moves: 22, baseTarget: 2500 },
  { minLevel: 7, maxLevel: 9, cols: 8, numTypes: 5, moves: 24, baseTarget: 3500 },
  { minLevel: 10, maxLevel: 12, cols: 8, numTypes: 6, moves: 26, baseTarget: 4500 },
  { minLevel: 13, maxLevel: 999, cols: 8, numTypes: 6, moves: 28, baseTarget: 5500, maxTarget: 10000 },
];
const LEVELS_RHYTHM_FROM = 16;

// Difficulty rhythm for the long tail: every 5th level is a tougher "hard" level
// and the one right after it is an easier breather, so the plateau doesn't feel
// flat and a hard level is always followed by a quick win.
const HARD_LEVEL_MULTIPLIER = 1.15;
const BREATHER_LEVEL_MULTIPLIER = 0.85;

export function isHardLevel(level, rhythmFrom) {
  return level >= rhythmFrom && level % 5 === 0;
}

function applyRhythm(level, target, rhythmFrom) {
  if (level < rhythmFrom) return target;
  if (isHardLevel(level, rhythmFrom)) return target * HARD_LEVEL_MULTIPLIER;
  if (isHardLevel(level - 1, rhythmFrom)) return target * BREATHER_LEVEL_MULTIPLIER;
  return target;
}

export function getLevelConfig(level) {
  const band = LEVEL_BANDS.find(b => level >= b.minLevel && level <= b.maxLevel)
    ?? LEVEL_BANDS[LEVEL_BANDS.length - 1];
  const stepsIntoBand = level - band.minLevel;
  const rawTarget = Math.min(band.baseTarget * (1 + stepsIntoBand * 0.15), band.maxTarget ?? Infinity);
  const targetScore = Math.round(applyRhythm(level, rawTarget, LEVELS_RHYTHM_FROM));
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
  // Capped for the same reason as LEVEL_BANDS: uncapped, a simulated player won
  // ~19% of level 12 and 0% from level 16 on.
  { minLevel: 10, maxLevel: 12, cols: 8, numTypes: 6, moves: 24, baseTarget: 24, maxTarget: 23 },
  { minLevel: 13, maxLevel: 999, cols: 8, numTypes: 6, moves: 26, baseTarget: 28, maxTarget: 26 },
];
const RESCUE_RHYTHM_FROM = 15;

export function getRescueLevelConfig(level) {
  const band = RESCUE_LEVEL_BANDS.find(b => level >= b.minLevel && level <= b.maxLevel)
    ?? RESCUE_LEVEL_BANDS[RESCUE_LEVEL_BANDS.length - 1];
  const stepsIntoBand = level - band.minLevel;
  const rawTarget = Math.min(band.baseTarget * (1 + stepsIntoBand * 0.2), band.maxTarget ?? Infinity);
  const targetCount = Math.round(applyRhythm(level, rawTarget, RESCUE_RHYTHM_FROM));
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

// Combo tier labels (1-3) and the big center-of-board callout words (indexed
// by cascade step; 0 = the swap's own match, which only gets one for a 4+
// match - see GameScreen) live in i18n as combo.label.N / combo.callout.N.
// One callout color per step:
export const COMBO_CALLOUT_COLORS = ['#30D158', '#64D2FF', '#FFD60A', '#FF9F0A', '#FF2D55', '#BF5AF2'];

// Streak: consecutive "great" moves (any cascade, or a 4+ match). Purely
// cosmetic - it drives the HUD badge and board glow but never changes scoring,
// so level targets stay balanced exactly as before.
export function isGreatMove(steps) {
  if (steps.length >= 2) return true;
  return steps.length > 0 && steps[0].runs.some(r => r.length >= 4);
}

// Zen Mode: every ZEN_BLOOM_POINTS scored grows one flower in the Zen panel - a
// gentle, open-ended goal for a mode that otherwise has none.
export const ZEN_BLOOM_POINTS = 3000;
