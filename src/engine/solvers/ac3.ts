import { Board, SolveResult, SolverStats, CellCoord } from '../types';
import { cloneBoard, validateBoard, BOARD_SIZE, getPeers } from '../board';

/**
 * Arc Consistency Algorithm #3 (AC-3) & MAC (Maintaining Arc Consistency)
 */

type DomainGrid = Set<number>[][];

const PEERS_TABLE: CellCoord[][][] = Array.from({ length: BOARD_SIZE }, (_, r) =>
  Array.from({ length: BOARD_SIZE }, (_, c) => getPeers(r, c))
);

function initializeDomains(board: Board): DomainGrid {
  const domains: DomainGrid = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => new Set<number>())
  );

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] !== 0) {
        domains[r][c].add(board[r][c]);
      } else {
        for (let num = 1; num <= 9; num++) {
          domains[r][c].add(num);
        }
      }
    }
  }

  return domains;
}

function cloneDomains(domains: DomainGrid): DomainGrid {
  return domains.map(row => row.map(d => new Set(d)));
}

/**
 * Revises arc (Xi, Xj):
 * Removes value x from Domain(Xi) if there is no value y in Domain(Xj) such that x != y.
 * In Sudoku, since constraint is Xi != Xj, if Domain(Xj) has exactly one element {y},
 * and x == y, then x cannot be in Domain(Xi).
 */
function revise(
  domains: DomainGrid,
  xi: CellCoord,
  xj: CellCoord
): boolean {
  let revised = false;
  const domainJ = domains[xj.row][xj.col];

  // If Xj has only one possible value, Xi cannot have that value
  if (domainJ.size === 1) {
    const singleVal = domainJ.values().next().value as number;
    const domainI = domains[xi.row][xi.col];
    if (domainI.has(singleVal)) {
      domainI.delete(singleVal);
      revised = true;
    }
  }

  return revised;
}

/**
 * Runs AC-3 algorithm on a queue of arcs.
 * Returns false if any domain becomes empty (contradiction/domain wipeout).
 */
export function runAC3(
  domains: DomainGrid,
  initialQueue?: [CellCoord, CellCoord][]
): boolean {
  const queue: [CellCoord, CellCoord][] = [];
  const inQueue = new Set<string>();

  const enqueue = (xi: CellCoord, xj: CellCoord) => {
    const key = `${xi.row},${xi.col}->${xj.row},${xj.col}`;
    if (!inQueue.has(key)) {
      inQueue.add(key);
      queue.push([xi, xj]);
    }
  };

  if (initialQueue) {
    for (const [xi, xj] of initialQueue) {
      enqueue(xi, xj);
    }
  } else {
    // Enqueue all directed arcs (Xi, Xj) where Xj is in Peers(Xi)
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const xi: CellCoord = { row: r, col: c };
        for (const xj of PEERS_TABLE[r][c]) {
          enqueue(xi, xj);
        }
      }
    }
  }

  while (queue.length > 0) {
    const [xi, xj] = queue.shift()!;
    inQueue.delete(`${xi.row},${xi.col}->${xj.row},${xj.col}`);

    if (revise(domains, xi, xj)) {
      if (domains[xi.row][xi.col].size === 0) {
        return false; // Domain wipeout!
      }

      // Re-enqueue all (Xk, Xi) where Xk in Peers(Xi) \ {Xj}
      for (const xk of PEERS_TABLE[xi.row][xi.col]) {
        if (xk.row !== xj.row || xk.col !== xj.col) {
          enqueue(xk, xi);
        }
      }
    }
  }

  return true;
}

/**
 * Maintains Arc Consistency (MAC) during Backtracking Search
 */
export function solveAC3(initialBoard: Board, maxSteps: number = 250_000): SolveResult {
  const startTime = performance.now();
  const board = cloneBoard(initialBoard);

  if (!validateBoard(board).isValid) {
    return {
      solved: false,
      solution: null,
      stats: { steps: 0, backtracks: 0, nodesVisited: 0, timeMs: performance.now() - startTime, solved: false },
    };
  }

  const initialDomains = initializeDomains(board);

  // Initial AC-3 preprocessing pass
  if (!runAC3(initialDomains)) {
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

  function selectMRVCell(domains: DomainGrid): CellCoord | null {
    let minSize = 10;
    let bestCell: CellCoord | null = null;

    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const dSize = domains[r][c].size;
        if (dSize > 1 && dSize < minSize) {
          minSize = dSize;
          bestCell = { row: r, col: c };
          if (minSize === 2) return bestCell; // Fast early exit
        }
      }
    }
    return bestCell;
  }

  function macSearch(currentDomains: DomainGrid): boolean {
    stats.nodesVisited++;
    if (stats.steps++ > maxSteps) return false;

    const cell = selectMRVCell(currentDomains);
    if (!cell) {
      // All cells have domain size 1 => solved!
      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          board[r][c] = currentDomains[r][c].values().next().value ?? 0;
        }
      }
      return true;
    }

    const { row, col } = cell;
    const candidates = Array.from(currentDomains[row][col]);

    for (const val of candidates) {
      // Speculatively assign val to (row, col)
      const nextDomains = cloneDomains(currentDomains);
      nextDomains[row][col] = new Set([val]);

      // MAC: Propagate arc consistency from assigned cell to its peers
      const arcsToPropagate: [CellCoord, CellCoord][] = PEERS_TABLE[row][col].map(peer => [
        peer,
        { row, col },
      ]);

      if (runAC3(nextDomains, arcsToPropagate)) {
        if (macSearch(nextDomains)) {
          return true;
        }
      }

      stats.backtracks++;
    }

    return false;
  }

  const solved = macSearch(initialDomains);
  stats.timeMs = performance.now() - startTime;
  stats.solved = solved;

  return {
    solved,
    solution: solved ? board : null,
    stats,
  };
}
