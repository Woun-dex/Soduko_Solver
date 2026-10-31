import { Board, SolveResult, SolverStats, CellCoord, AlgorithmType } from './types';
import {
  cloneBoard,
  validateBoard,
  getPeers,
  BOARD_SIZE,
  computeBoardBitmasks,
  getCandidateBitmask,
  countCandidatesInBitmask,
  getBoxIndex,
} from './board';
import { solveBasicBacktracking } from './solver-basic';
import { solveAC3 } from './solvers/ac3';
import { solveDLX } from './solvers/dlx';

/**
 * Level 4 & 5: Advanced Constraint Satisfaction Problem (CSP) Solvers
 */

export const PEERS_MAP: CellCoord[][][] = Array.from({ length: BOARD_SIZE }, (_, r) =>
  Array.from({ length: BOARD_SIZE }, (_, c) => getPeers(r, c))
);

export function findMRVCell(
  board: Board,
  useDegreeTieBreaker: boolean = false
): { cell: CellCoord | null; candidates: number[]; isDeadEnd: boolean } {
  let bestCell: CellCoord | null = null;
  let minCandidatesCount = 10;
  let bestCandidates: number[] = [];
  let maxDegree = -1;

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] === 0) {
        const candidates = computeCandidatesForCell(board, r, c);
        const count = candidates.length;

        if (count === 0) {
          return { cell: { row: r, col: c }, candidates: [], isDeadEnd: true };
        }

        if (count < minCandidatesCount) {
          minCandidatesCount = count;
          bestCell = { row: r, col: c };
          bestCandidates = candidates;
          if (useDegreeTieBreaker) {
            maxDegree = countEmptyPeers(board, r, c);
          }
          if (count === 1) {
            return { cell: bestCell, candidates: bestCandidates, isDeadEnd: false };
          }
        } else if (useDegreeTieBreaker && count === minCandidatesCount) {
          const degree = countEmptyPeers(board, r, c);
          if (degree > maxDegree) {
            maxDegree = degree;
            bestCell = { row: r, col: c };
            bestCandidates = candidates;
          }
        }
      }
    }
  }

  return { cell: bestCell, candidates: bestCandidates, isDeadEnd: false };
}

function countEmptyPeers(board: Board, r: number, c: number): number {
  let count = 0;
  for (const peer of PEERS_MAP[r][c]) {
    if (board[peer.row][peer.col] === 0) {
      count++;
    }
  }
  return count;
}

export function computeCandidatesForCell(board: Board, row: number, col: number): number[] {
  let mask = 0;
  for (let i = 0; i < BOARD_SIZE; i++) {
    if (board[row][i] !== 0) mask |= 1 << (board[row][i] - 1);
    if (board[i][col] !== 0) mask |= 1 << (board[i][col] - 1);
  }
  const br = Math.floor(row / 3) * 3;
  const bc = Math.floor(col / 3) * 3;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const val = board[br + r][bc + c];
      if (val !== 0) mask |= 1 << (val - 1);
    }
  }

  const valid: number[] = [];
  for (let num = 1; num <= 9; num++) {
    if ((mask & (1 << (num - 1))) === 0) {
      valid.push(num);
    }
  }
  return valid;
}

export function orderCandidatesLCV(
  board: Board,
  row: number,
  col: number,
  candidates: number[]
): number[] {
  if (candidates.length <= 1) return candidates;

  const peers = PEERS_MAP[row][col].filter(p => board[p.row][p.col] === 0);

  const scores = candidates.map(val => {
    let constrainedCount = 0;
    for (const peer of peers) {
      const peerCandidates = computeCandidatesForCell(board, peer.row, peer.col);
      if (peerCandidates.includes(val)) {
        constrainedCount++;
      }
    }
    return { val, score: constrainedCount };
  });

  scores.sort((a, b) => a.score - b.score);
  return scores.map(s => s.val);
}

/**
 * Forward checking verification:
 * Checks whether placing value at (row, col) would leave any peer with 0 candidates.
 */
export function checkForwardCheckingValid(
  board: Board,
  row: number,
  col: number,
  val: number
): boolean {
  board[row][col] = val;
  let isValid = true;

  for (const peer of PEERS_MAP[row][col]) {
    if (board[peer.row][peer.col] === 0) {
      const peerCands = computeCandidatesForCell(board, peer.row, peer.col);
      if (peerCands.length === 0) {
        isValid = false;
        break;
      }
    }
  }

  board[row][col] = 0;
  return isValid;
}

/**
 * Solve using Forward Checking + MRV
 */
export function solveForwardChecking(initialBoard: Board, maxSteps: number = 250_000): SolveResult {
  const startTime = performance.now();
  const board = cloneBoard(initialBoard);

  if (!validateBoard(board).isValid) {
    return {
      solved: false,
      solution: null,
      stats: { steps: 0, backtracks: 0, nodesVisited: 0, timeMs: performance.now() - startTime, solved: false },
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
    if (stats.steps++ > maxSteps) return false;

    const { cell, candidates, isDeadEnd } = findMRVCell(board, false);
    if (isDeadEnd) return false;
    if (!cell) return true;

    const { row, col } = cell;

    for (const val of candidates) {
      // Forward check: prune branch if placing val wipes out any peer domain
      if (!checkForwardCheckingValid(board, row, col, val)) {
        stats.backtracks++;
        continue;
      }

      board[row][col] = val;
      if (backtrack()) return true;
      board[row][col] = 0;
      stats.backtracks++;
    }

    return false;
  }

  const solved = backtrack();
  stats.timeMs = performance.now() - startTime;
  stats.solved = solved;

  return { solved, solution: solved ? board : null, stats };
}

export function solveMRV(initialBoard: Board, maxSteps: number = 1_000_000): SolveResult {
  const startTime = performance.now();
  const board = cloneBoard(initialBoard);

  if (!validateBoard(board).isValid) {
    return {
      solved: false,
      solution: null,
      stats: { steps: 0, backtracks: 0, nodesVisited: 0, timeMs: performance.now() - startTime, solved: false },
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
    if (stats.steps++ > maxSteps) return false;

    const { cell, candidates, isDeadEnd } = findMRVCell(board, false);
    if (isDeadEnd) return false;
    if (!cell) return true;

    const { row, col } = cell;
    for (const val of candidates) {
      board[row][col] = val;
      if (backtrack()) return true;
      board[row][col] = 0;
      stats.backtracks++;
    }

    return false;
  }

  const solved = backtrack();
  stats.timeMs = performance.now() - startTime;
  stats.solved = solved;

  return { solved, solution: solved ? board : null, stats };
}

export function solveMRVDegreeLCV(initialBoard: Board, maxSteps: number = 1_000_000): SolveResult {
  const startTime = performance.now();
  const board = cloneBoard(initialBoard);

  if (!validateBoard(board).isValid) {
    return {
      solved: false,
      solution: null,
      stats: { steps: 0, backtracks: 0, nodesVisited: 0, timeMs: performance.now() - startTime, solved: false },
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
    if (stats.steps++ > maxSteps) return false;

    const { cell, candidates, isDeadEnd } = findMRVCell(board, true);
    if (isDeadEnd) return false;
    if (!cell) return true;

    const { row, col } = cell;
    const orderedCandidates = orderCandidatesLCV(board, row, col, candidates);

    for (const val of orderedCandidates) {
      board[row][col] = val;
      if (backtrack()) return true;
      board[row][col] = 0;
      stats.backtracks++;
    }

    return false;
  }

  const solved = backtrack();
  stats.timeMs = performance.now() - startTime;
  stats.solved = solved;

  return { solved, solution: solved ? board : null, stats };
}

export function solveBitmaskOptimized(initialBoard: Board, maxSteps: number = 1_000_000): SolveResult {
  const startTime = performance.now();
  const board = cloneBoard(initialBoard);

  if (!validateBoard(board).isValid) {
    return {
      solved: false,
      solution: null,
      stats: { steps: 0, backtracks: 0, nodesVisited: 0, timeMs: performance.now() - startTime, solved: false },
    };
  }

  const masks = computeBoardBitmasks(board);
  const stats: SolverStats = {
    steps: 0,
    backtracks: 0,
    nodesVisited: 0,
    timeMs: 0,
    solved: false,
  };

  function findBestCell(): { row: number; col: number; candidateMask: number } | null | 'dead-end' {
    let bestR = -1;
    let bestC = -1;
    let minCount = 10;
    let bestMask = 0;

    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (board[r][c] === 0) {
          const mask = getCandidateBitmask(masks, r, c);
          const count = countCandidatesInBitmask(mask);

          if (count === 0) return 'dead-end';

          if (count < minCount) {
            minCount = count;
            bestR = r;
            bestC = c;
            bestMask = mask;
            if (count === 1) {
              return { row: bestR, col: bestC, candidateMask: bestMask };
            }
          }
        }
      }
    }

    if (bestR === -1) return null;
    return { row: bestR, col: bestC, candidateMask: bestMask };
  }

  function backtrack(): boolean {
    stats.nodesVisited++;
    if (stats.steps++ > maxSteps) return false;

    const result = findBestCell();
    if (result === 'dead-end') return false;
    if (result === null) return true;

    const { row, col, candidateMask } = result;
    const box = getBoxIndex(row, col);

    let currentMask = candidateMask;
    while (currentMask > 0) {
      const lowestBit = currentMask & -currentMask;
      currentMask &= ~lowestBit;

      const val = Math.log2(lowestBit) + 1;

      board[row][col] = val;
      masks.rowMasks[row] |= lowestBit;
      masks.colMasks[col] |= lowestBit;
      masks.boxMasks[box] |= lowestBit;

      if (backtrack()) return true;

      board[row][col] = 0;
      masks.rowMasks[row] &= ~lowestBit;
      masks.colMasks[col] &= ~lowestBit;
      masks.boxMasks[box] &= ~lowestBit;
      stats.backtracks++;
    }

    return false;
  }

  const solved = backtrack();
  stats.timeMs = performance.now() - startTime;
  stats.solved = solved;

  return { solved, solution: solved ? board : null, stats };
}

export function solveWithAlgorithm(
  board: Board,
  algorithm: AlgorithmType
): SolveResult {
  switch (algorithm) {
    case 'basic':
      return solveBasicBacktracking(board);
    case 'mrv':
      return solveMRV(board);
    case 'mrv-degree':
      return solveMRVDegreeLCV(board);
    case 'forward-checking':
      return solveForwardChecking(board);
    case 'ac3':
      return solveAC3(board);
    case 'dlx':
      return solveDLX(board);
    case 'bitmask-optimized':
    default:
      return solveBitmaskOptimized(board);
  }
}
