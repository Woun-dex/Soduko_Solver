import { Board, SolveResult, SolverStats } from './types';
import {
  cloneBoard,
  findFirstEmptyCell,
  getValidCandidates,
  validateBoard,
} from './board';

/**
 * Level 1: Basic Backtracking Sudoku Solver
 * - Finds first empty cell (row-major order)
 * - Tries candidate digits 1..9
 * - Recurses with DFS
 * - Backtracks if no candidate leads to a solution
 * - Detects unsolvable puzzles
 */
export function solveBasicBacktracking(
  initialBoard: Board,
  maxSteps: number = 1_000_000
): SolveResult {
  const startTime = performance.now();
  const board = cloneBoard(initialBoard);

  // Challenge 5: Detect unsolvable initial board (has conflicts)
  const initialValidation = validateBoard(board);
  if (!initialValidation.isValid) {
    return {
      solved: false,
      solution: null,
      stats: {
        steps: 0,
        backtracks: 0,
        nodesVisited: 0,
        timeMs: performance.now() - startTime,
        solved: false,
      },
    };
  }

  const stats: SolverStats = {
    steps: 0,
    backtracks: 0,
    nodesVisited: 0,
    timeMs: 0,
    solved: false,
  };

  function backtrack(): boolean {
    stats.nodesVisited++;
    if (stats.steps++ > maxSteps) {
      return false; // Safety cutoff for massive search spaces
    }

    // Challenge 2: Find first empty cell
    const emptyCell = findFirstEmptyCell(board);
    if (!emptyCell) {
      // Puzzle is fully filled!
      return true;
    }

    const { row, col } = emptyCell;

    // Challenge 3: Determine valid candidates
    const candidates = getValidCandidates(board, row, col);
    if (candidates.length === 0) {
      // Challenge 5: Dead end detected (no valid candidates)
      return false;
    }

    // Challenge 4: Try each candidate
    for (const val of candidates) {
      board[row][col] = val;

      if (backtrack()) {
        return true;
      }

      // Backtrack
      board[row][col] = 0;
      stats.backtracks++;
    }

    return false;
  }

  const solved = backtrack();
  stats.timeMs = performance.now() - startTime;
  stats.solved = solved;

  return {
    solved,
    solution: solved ? board : null,
    stats,
  };
}

