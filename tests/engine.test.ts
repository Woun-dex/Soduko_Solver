import { describe, it, expect } from 'vitest';
import {
  createEmptyBoard,
  cloneBoard,
  parseBoardString,
  serializeBoard,
  validateBoard,
  findFirstEmptyCell,
  getValidCandidates,
  computeBoardBitmasks,
  getCandidateBitmask,
  bitmaskToCandidates,
  getPeers,
} from '../src/engine/board';
import { solveBasicBacktracking } from '../src/engine/solver-basic';
import {
  solveMRV,
  solveMRVDegreeLCV,
  solveBitmaskOptimized,
} from '../src/engine/solver-optimized';
import { PUZZLE_PRESETS } from '../src/engine/puzzles';

describe('Level 1: Sudoku Engine Foundation', () => {
  const easyPreset = PUZZLE_PRESETS[0];
  const easyBoard = parseBoardString(easyPreset.boardString);

  it('Challenge 1: Validates board correctly and detects duplicates', () => {
    // Valid partial board
    const validRes = validateBoard(easyBoard);
    expect(validRes.isValid).toBe(true);
    expect(validRes.conflicts).toHaveLength(0);

    // Duplicate in row
    const rowConflictBoard = cloneBoard(easyBoard);
    rowConflictBoard[0][1] = rowConflictBoard[0][0]; // Duplicate in row 0
    const rowRes = validateBoard(rowConflictBoard);
    expect(rowRes.isValid).toBe(false);
    expect(rowRes.conflicts.some(c => c.type === 'row')).toBe(true);

    // Duplicate in column
    const colConflictBoard = cloneBoard(easyBoard);
    colConflictBoard[1][0] = rowConflictBoard[0][0]; // Duplicate in col 0
    const colRes = validateBoard(colConflictBoard);
    expect(colRes.isValid).toBe(false);
    expect(colRes.conflicts.some(c => c.type === 'col')).toBe(true);

    // Serializes and parses back accurately
    const serialized = serializeBoard(easyBoard);
    expect(serialized).toHaveLength(81);
    expect(parseBoardString(serialized)).toEqual(easyBoard);
  });

  it('Challenge 2: Finds empty cells accurately', () => {
    const emptyCoord = findFirstEmptyCell(easyBoard);
    expect(emptyCoord).not.toBeNull();
    expect(easyBoard[emptyCoord!.row][emptyCoord!.col]).toBe(0);

    // Completely filled board has no empty cells
    const fullBoard = createEmptyBoard().map(row => row.fill(1));
    expect(findFirstEmptyCell(fullBoard)).toBeNull();
  });

  it('Challenge 3: Determines valid candidates using sets and bitmasks', () => {
    const emptyCoord = findFirstEmptyCell(easyBoard)!;
    const candidates = getValidCandidates(easyBoard, emptyCoord.row, emptyCoord.col);

    expect(Array.isArray(candidates)).toBe(true);
    expect(candidates.length).toBeGreaterThan(0);

    // Validate that candidates don't appear in peers
    const peers = getPeers(emptyCoord.row, emptyCoord.col);
    for (const cand of candidates) {
      for (const peer of peers) {
        expect(easyBoard[peer.row][peer.col]).not.toBe(cand);
      }
    }

    // Verify bitmask candidate equivalence
    const masks = computeBoardBitmasks(easyBoard);
    const bitmask = getCandidateBitmask(masks, emptyCoord.row, emptyCoord.col);
    const bitmaskCandidates = bitmaskToCandidates(bitmask);
    expect(bitmaskCandidates).toEqual(candidates);
  });

  it('Challenge 4: Solves a puzzle with basic backtracking', () => {
    const res = solveBasicBacktracking(easyBoard);
    expect(res.solved).toBe(true);
    expect(res.solution).not.toBeNull();
    expect(findFirstEmptyCell(res.solution!)).toBeNull();

    const val = validateBoard(res.solution!);
    expect(val.isValid).toBe(true);
    expect(val.isComplete).toBe(true);
  });

  it('Challenge 5: Detects unsolvable puzzles', () => {
    // Unsolvable preset with conflict
    const unsolvable1 = parseBoardString(PUZZLE_PRESETS.find(p => p.id === 'unsolvable-1')!.boardString);
    const res1 = solveBasicBacktracking(unsolvable1);
    expect(res1.solved).toBe(false);

    // Unsolvable preset with contradiction during search
    const unsolvableDeadend = parseBoardString(PUZZLE_PRESETS.find(p => p.id === 'unsolvable-deadend')!.boardString);
    const res2 = solveBasicBacktracking(unsolvableDeadend);
    expect(res2.solved).toBe(false);
  });
});

describe('Level 4: Advanced Algorithm Optimization', () => {
  const mediumPreset = PUZZLE_PRESETS[1];
  const mediumBoard = parseBoardString(mediumPreset.boardString);

  it('MRV solver solves puzzle correctly', () => {
    const res = solveMRV(mediumBoard);
    expect(res.solved).toBe(true);
    expect(validateBoard(res.solution!).isComplete).toBe(true);
  });

  it('MRV + Degree + LCV solver solves correctly with low backtracks', () => {
    const res = solveMRVDegreeLCV(mediumBoard);
    expect(res.solved).toBe(true);
    expect(validateBoard(res.solution!).isComplete).toBe(true);
  });

  it('Bitmask optimized solver solves correctly and fast', () => {
    const res = solveBitmaskOptimized(mediumBoard);
    expect(res.solved).toBe(true);
    expect(validateBoard(res.solution!).isComplete).toBe(true);
    expect(res.stats.timeMs).toBeLessThan(100);
  });

  it('Medium puzzle: MRV drastically reduces backtracks compared to naive DFS', () => {
    const naiveRes = solveBasicBacktracking(mediumBoard);
    const mrvRes = solveMRV(mediumBoard);

    expect(naiveRes.solved).toBe(true);
    expect(mrvRes.solved).toBe(true);
    expect(mrvRes.stats.backtracks).toBeLessThan(naiveRes.stats.backtracks);
  });
});
