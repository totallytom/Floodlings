import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Image, Animated, Easing, PanResponder, Dimensions, StyleSheet } from 'react-native';
import { iconForType, colorForType } from '../animals';
import { swapCells } from '../gameLogic';
import { useReduceMotion } from '../hooks/useReduceMotion';

const PADDING = 16;
const GAP = 4;
const SWAP_SETTLE_MS = 220;
const POP_MS = 180;
const FALL_SETTLE_MS = 260;
const INVALID_REVERT_MS = 160;

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function boardToTiles(board, enterRowMap) {
  const tiles = [];
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[r].length; c++) {
      const cell = board[r][c];
      if (cell) tiles.push({ id: cell.id, type: cell.type, row: r, col: c, enterFromRow: enterRowMap?.get(cell.id) });
    }
  }
  return tiles;
}

function Tile({ id, type, row, col, tileSize, popping, shakeNonce, active, reduceMotion, enterFromRow, onSwipe }) {
  const pos = useRef(new Animated.ValueXY({ x: col * (tileSize + GAP), y: (enterFromRow ?? row) * (tileSize + GAP) })).current;
  const scale = useRef(new Animated.Value(1)).current;
  // Two tiles swapping places move in a straight line directly toward each
  // other and, being the same size, would fully overlap/clip through one
  // another at the midpoint. Shrinking briefly while in transit (any position
  // change - swap, fall, or revert) leaves a visible gap between tiles even
  // when their centers coincide, so they can touch without visually colliding.
  const transitScale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const shakeX = useRef(new Animated.Value(0)).current;
  const activeRef = useRef(active);
  activeRef.current = active;

  // tileSize can change after mount (e.g. the objective bar/timer above the
  // board settling its height, which shrinks the height budget). Snap every
  // tile to its new grid slot immediately - otherwise only tiles whose row/col
  // later change would pick up the new spacing, leaving stationary tiles at
  // their old pixel positions and the grid visibly out of line.
  const prevTileSizeRef = useRef(tileSize);
  useEffect(() => {
    if (prevTileSizeRef.current === tileSize) return;
    prevTileSizeRef.current = tileSize;
    pos.stopAnimation();
    pos.setValue({ x: col * (tileSize + GAP), y: row * (tileSize + GAP) });
  }, [tileSize]);

  useEffect(() => {
    const duration = reduceMotion ? 1 : SWAP_SETTLE_MS;
    Animated.parallel([
      Animated.timing(pos, {
        toValue: { x: col * (tileSize + GAP), y: row * (tileSize + GAP) },
        duration,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(transitScale, { toValue: 0.78, duration: duration * 0.4, useNativeDriver: true }),
        Animated.timing(transitScale, { toValue: 1, duration: duration * 0.6, useNativeDriver: true }),
      ]),
    ]).start();
  }, [row, col]);

  useEffect(() => {
    if (!popping) {
      scale.setValue(1);
      opacity.setValue(1);
      return;
    }
    Animated.parallel([
      Animated.timing(scale, { toValue: 0, duration: reduceMotion ? 1 : POP_MS, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: reduceMotion ? 1 : POP_MS, useNativeDriver: true }),
    ]).start();
  }, [popping]);

  useEffect(() => {
    if (!shakeNonce || reduceMotion) return;
    Animated.sequence([
      Animated.timing(shakeX, { toValue: 6, duration: 45, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -6, duration: 45, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 4, duration: 45, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 0, duration: 45, useNativeDriver: true }),
    ]).start();
  }, [shakeNonce]);

  // The PanResponder below is created once (useRef) and never rebuilt, so its
  // handlers must read row/col/tileSize/onSwipe through refs kept current on
  // every render - otherwise a tile that has since fallen to a new row (which
  // happens constantly during cascades) would keep reporting its stale
  // mount-time position/swap-handler forever, silently breaking swipes on any
  // tile that has ever moved.
  const rowRef = useRef(row);
  rowRef.current = row;
  const colRef = useRef(col);
  colRef.current = col;
  const tileSizeRef = useRef(tileSize);
  tileSizeRef.current = tileSize;
  const onSwipeRef = useRef(onSwipe);
  onSwipeRef.current = onSwipe;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => activeRef.current,
      onMoveShouldSetPanResponder: (_, g) => activeRef.current && (Math.abs(g.dx) > 4 || Math.abs(g.dy) > 4),
      onPanResponderRelease: (_, g) => {
        const THRESH = tileSizeRef.current * 0.25;
        let dir = null;
        if (Math.abs(g.dx) > Math.abs(g.dy)) {
          if (Math.abs(g.dx) > THRESH) dir = g.dx > 0 ? [0, 1] : [0, -1];
        } else if (Math.abs(g.dy) > THRESH) {
          dir = g.dy > 0 ? [1, 0] : [-1, 0];
        }
        if (dir) onSwipeRef.current(rowRef.current, colRef.current, dir);
      },
    })
  ).current;

  const swatchSize = tileSize - 4;

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.tile,
        {
          width: tileSize,
          height: tileSize,
          transform: [...pos.getTranslateTransform(), { translateX: shakeX }, { scale: Animated.multiply(scale, transitScale) }],
          opacity,
        },
      ]}
    >
      <View
        style={[
          styles.swatch,
          { width: swatchSize, height: swatchSize, borderRadius: swatchSize * 0.22, backgroundColor: colorForType(type) },
        ]}
      >
        <Image
          source={iconForType(type)}
          style={{ width: tileSize * 0.72, height: tileSize * 0.72 }}
          resizeMode="contain"
          accessible={false}
        />
      </View>
    </Animated.View>
  );
}

export default function Board({ board, movesLeft, phase, paused, pendingResolution, onSwap, onResolutionDone, maxWidth, maxHeight }) {
  const reduceMotion = useReduceMotion();
  const [optimisticBoard, setOptimisticBoard] = useState(null);
  const [poppingKeys, setPoppingKeys] = useState(new Set());
  const [shakeInfo, setShakeInfo] = useState(null);
  const shakeNonceRef = useRef(0);
  const enterRowMapRef = useRef(null);

  const numRows = board ? board.length : 0;
  const numCols = board && board[0] ? board[0].length : 0;
  // maxWidth/maxHeight come from the parent measuring its actual on-screen
  // container, so the board can be a true rectangle (more rows than columns)
  // sized to fill both dimensions independently, instead of being capped to a
  // square by whichever is smaller. Before that measurement lands (first
  // paint), fall back to the old width-only guess for both.
  const fallbackWidth = Dimensions.get('window').width - PADDING * 2;
  const widthBudget = maxWidth > 0 ? maxWidth : fallbackWidth;
  const heightBudget = maxHeight > 0 ? maxHeight : fallbackWidth;
  // Floored to a whole pixel - a fractional size can round differently between
  // a tile's width/height style and its transform: translate position on some
  // devices, opening tiny inconsistent seams across the grid instead of one
  // uniform gap.
  const tileSize = (numRows && numCols)
    ? Math.floor(Math.min(
        (widthBudget - GAP * (numCols - 1)) / numCols,
        (heightBudget - GAP * (numRows - 1)) / numRows
      ))
    : 0;
  const boardPixelWidth = tileSize * numCols + GAP * (numCols - 1);
  const boardPixelHeight = tileSize * numRows + GAP * (numRows - 1);
  const active = phase === 'playing' && !paused;

  const displayBoard = optimisticBoard ?? board;

  const trySwap = useCallback((row, col, dir) => {
    if (!active) return;
    const a = { row, col };
    const b = { row: row + dir[0], col: col + dir[1] };
    if (b.row < 0 || b.row >= numRows || b.col < 0 || b.col >= numCols) return;

    setOptimisticBoard(swapCells(board, a, b));
    const valid = onSwap(a, b);
    if (!valid) {
      shakeNonceRef.current += 1;
      setShakeInfo({ a: [a.row, a.col], b: [b.row, b.col], nonce: shakeNonceRef.current });
      setTimeout(() => setOptimisticBoard(null), INVALID_REVERT_MS);
    }
  }, [board, numRows, numCols, active, onSwap]);

  useEffect(() => {
    if (!pendingResolution) return;
    let cancelled = false;

    (async () => {
      enterRowMapRef.current = null;
      setOptimisticBoard(pendingResolution.swappedBoard);
      await wait(reduceMotion ? 1 : SWAP_SETTLE_MS);

      for (const step of pendingResolution.steps) {
        if (cancelled) return;
        setPoppingKeys(new Set(step.matchedCells.map(([r, c]) => `${r},${c}`)));
        await wait(reduceMotion ? 1 : POP_MS);
        if (cancelled) return;

        const enterMap = new Map();
        for (const fm of step.fallMoves) {
          if (fm.isNew) {
            const cell = step.boardAfter[fm.toRow][fm.col];
            if (cell) enterMap.set(cell.id, fm.fromRow);
          }
        }
        enterRowMapRef.current = enterMap;
        setOptimisticBoard(step.boardAfter);
        setPoppingKeys(new Set());
        await wait(reduceMotion ? 1 : FALL_SETTLE_MS);
      }

      if (cancelled) return;
      enterRowMapRef.current = null;
      setOptimisticBoard(null);
      onResolutionDone();
    })();

    return () => { cancelled = true; };
  }, [pendingResolution, reduceMotion, onResolutionDone]);

  if (!displayBoard) return null;

  const tiles = boardToTiles(displayBoard, enterRowMapRef.current);

  return (
    <View
      style={[styles.grid, { width: boardPixelWidth, height: boardPixelHeight }]}
      accessible={true}
      accessibilityLabel={`Zoo match 3 board, ${movesLeft} moves left`}
      accessibilityRole="image"
    >
      {tiles.map(t => (
        <Tile
          key={t.id}
          id={t.id}
          type={t.type}
          row={t.row}
          col={t.col}
          tileSize={tileSize}
          reduceMotion={reduceMotion}
          active={active}
          enterFromRow={t.enterFromRow}
          popping={poppingKeys.has(`${t.row},${t.col}`)}
          shakeNonce={
            shakeInfo && shakeInfo.nonce === shakeNonceRef.current &&
            ((shakeInfo.a[0] === t.row && shakeInfo.a[1] === t.col) || (shakeInfo.b[0] === t.row && shakeInfo.b[1] === t.col))
              ? shakeInfo.nonce
              : 0
          }
          onSwipe={trySwap}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    alignSelf: 'center',
  },
  tile: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatch: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
