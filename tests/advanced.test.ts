import { describe, it, expect } from 'vitest';
import { parseBoardString, validateBoard } from '../src/engine/board';
import { solveAC3 } from '../src/engine/solvers/ac3';
import { solveDLX } from '../src/engine/solvers/dlx';
import { solveForwardChecking } from '../src/engine/solver-optimized';
import { generatePuzzle, generateSolvedBoard } from '../src/engine/generator';
import { PUZZLE_PRESETS } from '../src/engine/puzzles';

describe('Level 5: Advanced Optimization (AC-3, DLX, Forward Checking)', () => {
  const hardPreset = PUZZLE_PRESETS[2];
  const hardBoard = parseBoardString(hardPreset.boardString);

  it('AC-3 (Maintaining Arc Consistency) solves difficult puzzles correctly', () => {
    const result = solveAC3(hardBoard);
    expect(result.solved).toBe(true);
    expect(result.solution).not.toBeNull();
    const val = validateBoard(result.solution!);
    expect(val.isValid).toBe(true);
    expect(val.isComplete).toBe(true);
  });

  it('Donald Knuth DLX solves exact cover instantly', () => {
    const result = solveDLX(hardBoard, 1);
    expect(result.solved).toBe(true);
    expect(result.solution).not.toBeNull();
    expect(result.solutionsCount).toBe(1);
    const val = validateBoard(result.solution!);
    expect(val.isValid).toBe(true);
    expect(val.isComplete).toBe(true);
  });

  it('Forward Checking prunes invalid branches correctly', () => {
    const result = solveForwardChecking(hardBoard);
    expect(result.solved).toBe(true);
    expect(result.solution).not.toBeNull();
    expect(validateBoard(result.solution!).isComplete).toBe(true);
  });

  it('All advanced solvers yield identical valid solutions on the same puzzle', () => {
    const dlxRes = solveDLX(hardBoard, 1);
    const ac3Res = solveAC3(hardBoard);
    const fcRes = solveForwardChecking(hardBoard);

    expect(dlxRes.solution).toEqual(ac3Res.solution);
    expect(dlxRes.solution).toEqual(fcRes.solution);
  });

  it('DLX accurately identifies unsolvable puzzle with 0 solutions', () => {
    const unsolvablePreset = PUZZLE_PRESETS.find(p => p.id === 'unsolvable-deadend')!;
    const board = parseBoardString(unsolvablePreset.boardString);
    const result = solveDLX(board, 2);
    expect(result.solved).toBe(false);
    expect(result.solutionsCount).toBe(0);
  });
});

describe('Level 7: Puzzle Generation and Uniqueness Verification', () => {
  it('Generates a fully valid solved terminal board', () => {
    const solved = generateSolvedBoard();
    const val = validateBoard(solved);
    expect(val.isValid).toBe(true);
    expect(val.isComplete).toBe(true);
  });

  it('Generated Easy puzzle has strictly 1 unique solution', () => {
    const puzzle = generatePuzzle('Easy');
    expect(puzzle.cluesCount).toBeGreaterThanOrEqual(30);
    expect(validateBoard(puzzle.board).isValid).toBe(true);

    // Verify uniqueness using DLX
    const check = solveDLX(puzzle.board, 2);
    expect(check.solutionsCount).toBe(1);
    expect(check.solution).toEqual(puzzle.solution);
  });

  it('Generated Medium puzzle has strictly 1 unique solution and 180-degree symmetry', () => {
    const puzzle = generatePuzzle('Medium', 'rotational180');
    expect(validateBoard(puzzle.board).isValid).toBe(true);

    const check = solveDLX(puzzle.board, 2);
    expect(check.solutionsCount).toBe(1);

    // Check 180-degree rotational symmetry
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const isClue1 = puzzle.board[r][c] !== 0;
        const isClue2 = puzzle.board[8 - r][8 - c] !== 0;
        expect(isClue1).toBe(isClue2);
      }
    }
  });

  it('Generated Hard puzzle maintains uniqueness with sparse clues', () => {
    const puzzle = generatePuzzle('Hard');
    expect(validateBoard(puzzle.board).isValid).toBe(true);
    const check = solveDLX(puzzle.board, 2);
    expect(check.solutionsCount).toBe(1);
  });
});

