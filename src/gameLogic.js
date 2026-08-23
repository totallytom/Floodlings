let _nextId = 0;
function allocId() {
  return _nextId++;
}

function makeCell(type) {
  return { id: allocId(), type };
}

export function isAdjacent(a, b) {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col) === 1;
}

export function swapCells(board, a, b) {
  const newBoard = board.map(row => row.slice());
  const tmp = newBoard[a.row][a.col];
  newBoard[a.row][a.col] = newBoard[b.row][b.col];
  newBoard[b.row][b.col] = tmp;
  return newBoard;
}

export function findMatches(board) {
  const rows = board.length;
  const cols = board[0].length;
  const runs = [];

  for (let r = 0; r < rows; r++) {
    let c = 0;
    while (c < cols) {
      const type = board[r][c].type;
      let end = c;
      while (end + 1 < cols && board[r][end + 1].type === type) end++;
      const length = end - c + 1;
      if (length >= 3) {
        const cells = [];
        for (let cc = c; cc <= end; cc++) cells.push([r, cc]);
        runs.push({ length, cells, orientation: 'row' });
      }
      c = end + 1;
    }
  }

  for (let c = 0; c < cols; c++) {
    let r = 0;
    while (r < rows) {
      const type = board[r][c].type;
      let end = r;
      while (end + 1 < rows && board[end + 1][c].type === type) end++;
      const length = end - r + 1;
      if (length >= 3) {
        const cells = [];
        for (let rr = r; rr <= end; rr++) cells.push([rr, c]);
        runs.push({ length, cells, orientation: 'col' });
      }
      r = end + 1;
    }
  }

  const matchedSet = new Set();
  for (const run of runs) {
    for (const [r, c] of run.cells) matchedSet.add(`${r},${c}`);
  }

  return { matchedSet, runs };
}

export function wouldMatch(board, a, b) {
  return findMatches(swapCells(board, a, b)).matchedSet.size > 0;
}

export function hasValidMove(board) {
  const rows = board.length;
  const cols = board[0].length;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (c + 1 < cols && wouldMatch(board, { row: r, col: c }, { row: r, col: c + 1 })) return true;
      if (r + 1 < rows && wouldMatch(board, { row: r, col: c }, { row: r + 1, col: c })) return true;
    }
  }
  return false;
}

export function generateBoard(rows, cols, numTypes, attempt = 0) {
  const board = Array.from({ length: rows }, () => new Array(cols).fill(null));

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const bad = new Set();
      if (c >= 2 && board[r][c - 1].type === board[r][c - 2].type) bad.add(board[r][c - 1].type);
      if (r >= 2 && board[r - 1][c].type === board[r - 2][c].type) bad.add(board[r - 1][c].type);

      let type = Math.floor(Math.random() * numTypes);
      if (bad.size > 0 && bad.size < numTypes) {
        let tries = 0;
        while (bad.has(type) && tries < 10) {
          type = Math.floor(Math.random() * numTypes);
          tries++;
        }
      }
      board[r][c] = makeCell(type);
    }
  }

  if (!hasValidMove(board) && attempt < 20) {
    return generateBoard(rows, cols, numTypes, attempt + 1);
  }
  return board;
}

export function applyGravityAndRefill(board, numTypes) {
  const rows = board.length;
  const cols = board[0].length;
  const newBoard = Array.from({ length: rows }, () => new Array(cols).fill(null));
  const fallMoves = [];

  for (let c = 0; c < cols; c++) {
    const existing = [];
    for (let r = 0; r < rows; r++) {
      if (board[r][c]) existing.push({ cell: board[r][c], fromRow: r });
    }
    const emptyCount = rows - existing.length;

    for (let i = 0; i < existing.length; i++) {
      const toRow = emptyCount + i;
      const { cell, fromRow } = existing[i];
      newBoard[toRow][c] = cell;
      if (fromRow !== toRow) {
        fallMoves.push({ col: c, fromRow, toRow, isNew: false });
      }
    }

    for (let i = 0; i < emptyCount; i++) {
      const toRow = i;
      const cell = makeCell(Math.floor(Math.random() * numTypes));
      newBoard[toRow][c] = cell;
      fallMoves.push({ col: c, fromRow: i - emptyCount, toRow, isNew: true });
    }
  }

  return { board: newBoard, fallMoves };
}

const POINTS_PER_CELL = 60;
export const CASCADE_MULTIPLIERS = [1, 1.5, 2.5, 4];

function scoreForRuns(runs, cascadeIndex) {
  let base = 0;
  for (const run of runs) {
    base += run.length * POINTS_PER_CELL;
    if (run.length === 4) base += 200;
    else if (run.length >= 5) base += 500;
  }
  const multiplier = CASCADE_MULTIPLIERS[Math.min(cascadeIndex, CASCADE_MULTIPLIERS.length - 1)];
  return Math.round(base * multiplier);
}

export function resolveBoard(board, numTypes) {
  let current = board;
  let cascadeIndex = 0;
  let totalScore = 0;
  const steps = [];

  while (true) {
    const { matchedSet, runs } = findMatches(current);
    if (matchedSet.size === 0) break;

    const cleared = current.map(row => row.slice());
    for (const key of matchedSet) {
      const [r, c] = key.split(',').map(Number);
      cleared[r][c] = null;
    }

    const scoreGained = scoreForRuns(runs, cascadeIndex);
    const { board: refilled, fallMoves } = applyGravityAndRefill(cleared, numTypes);

    steps.push({
      matchedCells: [...matchedSet].map(k => k.split(',').map(Number)),
      runs,
      fallMoves,
      scoreGained,
      cascadeIndex,
      boardAfter: refilled,
    });

    totalScore += scoreGained;
    current = refilled;
    cascadeIndex++;
  }

  if (!hasValidMove(current)) {
    current = generateBoard(current.length, current[0].length, numTypes);
  }

  return { finalBoard: current, steps, totalScore, maxCascade: cascadeIndex };
}
