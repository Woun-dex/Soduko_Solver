import { Board, SolverEvent, AlgorithmType } from './types';
import {
  cloneBoard,
  validateBoard,
  findFirstEmptyCell,
  getValidCandidates,
} from './board';
import { findMRVCell, orderCandidatesLCV } from './solver-optimized';

/**
 * Level 3: Visualization Generator
 * Produces a sequence/stream of events for animated visualization.
 * Can be run step-by-step or accumulated into an event history timeline.
 */
export function* createSolverGenerator(
  initialBoard: Board,
  algorithm: AlgorithmType = 'mrv',
  maxEvents: number = 50_000
): Generator<SolverEvent, boolean, boolean | undefined> {
  let eventCounter = 0;
  const board = cloneBoard(initialBoard);

  const initialVal = validateBoard(board);
  if (!initialVal.isValid) {
    yield {
      id: ++eventCounter,
      type: 'UNSOLVABLE',
      row: -1,
      col: -1,
      message: 'Board has initial conflicting duplicate numbers. Unsolvable!',
      boardSnapshot: cloneBoard(board),
    };
    return false;
  }

  function* solveBasic(): Generator<SolverEvent, boolean, boolean | undefined> {
    const emptyCell = findFirstEmptyCell(board);
    if (!emptyCell) {
      yield {
        id: ++eventCounter,
        type: 'SOLVED',
        row: -1,
        col: -1,
        message: 'Puzzle completely solved!',
        boardSnapshot: cloneBoard(board),
      };
      return true;
    }

    const { row, col } = emptyCell;
    const candidates = getValidCandidates(board, row, col);

    yield {
      id: ++eventCounter,
      type: 'SELECT_CELL',
      row,
      col,
      candidates,
      remainingDomainSize: candidates.length,
      message: `Selected cell (${row + 1}, ${col + 1}) [Naive scan]. Valid candidates: [${candidates.join(', ')}]`,
      boardSnapshot: cloneBoard(board),
    };

    if (candidates.length === 0) {
      yield {
        id: ++eventCounter,
        type: 'BACKTRACK',
        row,
        col,
        message: `Cell (${row + 1}, ${col + 1}) has no valid candidates! Backtracking.`,
        boardSnapshot: cloneBoard(board),
      };
      return false;
    }

    for (const val of candidates) {
      if (eventCounter >= maxEvents) return false;

      board[row][col] = val;
      yield {
        id: ++eventCounter,
        type: 'TRY_VALUE',
        row,
        col,
        value: val,
        candidates,
        message: `Trying candidate ${val} at (${row + 1}, ${col + 1})`,
        boardSnapshot: cloneBoard(board),
      };

      const solved: boolean = yield* solveBasic();
      if (solved) return true;

      // Backtrack
      board[row][col] = 0;
      yield {
        id: ++eventCounter,
        type: 'BACKTRACK',
        row,
        col,
        value: val,
        message: `Candidate ${val} failed at (${row + 1}, ${col + 1}). Erasing and backtracking.`,
        boardSnapshot: cloneBoard(board),
      };
    }

    return false;
  }

  function* solveCSP(useDegree: boolean, useLCV: boolean): Generator<SolverEvent, boolean, boolean | undefined> {
    const { cell, candidates, isDeadEnd } = findMRVCell(board, useDegree);

    if (isDeadEnd) {
      yield {
        id: ++eventCounter,
        type: 'BACKTRACK',
        row: cell?.row ?? -1,
        col: cell?.col ?? -1,
        message: `Domain wipeout detected! Cell (${(cell?.row ?? 0) + 1}, ${(cell?.col ?? 0) + 1}) has 0 remaining candidates. Pruning branch.`,
        boardSnapshot: cloneBoard(board),
      };
      return false;
    }

    if (!cell) {
      yield {
        id: ++eventCounter,
        type: 'SOLVED',
        row: -1,
        col: -1,
        message: 'Puzzle completely solved!',
        boardSnapshot: cloneBoard(board),
      };
      return true;
    }

    const { row, col } = cell;
    const finalCandidates = useLCV ? orderCandidatesLCV(board, row, col, candidates) : candidates;

    yield {
      id: ++eventCounter,
      type: 'SELECT_CELL',
      row,
      col,
      candidates: finalCandidates,
      remainingDomainSize: finalCandidates.length,
      message: `Selected cell (${row + 1}, ${col + 1}) via MRV (${finalCandidates.length} candidate${finalCandidates.length === 1 ? ' - Naked Single!' : 's'}). Candidates: [${finalCandidates.join(', ')}]`,
      boardSnapshot: cloneBoard(board),
    };

    for (const val of finalCandidates) {
      if (eventCounter >= maxEvents) return false;

      board[row][col] = val;
      yield {
        id: ++eventCounter,
        type: 'TRY_VALUE',
        row,
        col,
        value: val,
        candidates: finalCandidates,
        message: `Trying candidate ${val} at (${row + 1}, ${col + 1})`,
        boardSnapshot: cloneBoard(board),
      };

      const solved: boolean = yield* solveCSP(useDegree, useLCV);
      if (solved) return true;

      // Backtrack
      board[row][col] = 0;
      yield {
        id: ++eventCounter,
        type: 'BACKTRACK',
        row,
        col,
        value: val,
        message: `Dead end reached with ${val} at (${row + 1}, ${col + 1}). Reverting to 0.`,
        boardSnapshot: cloneBoard(board),
      };
    }

    return false;
  }

  let success = false;
  if (algorithm === 'basic') {
    success = yield* solveBasic();
  } else if (algorithm === 'mrv') {
    success = yield* solveCSP(false, false);
  } else {
    success = yield* solveCSP(true, true);
  }

  if (!success && eventCounter < maxEvents) {
    yield {
      id: ++eventCounter,
      type: 'UNSOLVABLE',
      row: -1,
      col: -1,
      message: 'Search space exhausted without finding a valid solution. Puzzle is unsolvable!',
      boardSnapshot: cloneBoard(board),
    };
  }

  return success;
}

/**
 * Pre-generate full timeline of events up to maxEvents.
 * Useful for instant playback, scrubbing, and timeline management.
 */
export function generateSolverTimeline(
  board: Board,
  algorithm: AlgorithmType = 'mrv',
  maxEvents: number = 10_000
): SolverEvent[] {
  const events: SolverEvent[] = [];
  const generator = createSolverGenerator(board, algorithm, maxEvents);

  let result = generator.next();
  while (!result.done && events.length < maxEvents) {
    events.push(result.value);
    result = generator.next();
  }

  return events;
}

