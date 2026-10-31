/**
 * Core types for Sudoku Engine, Visualizer, CSP Solvers, and Worker RPC
 */

export type Board = number[][];

export interface CellCoord {
  row: number;
  col: number;
}

export interface CellConflict {
  row: number;
  col: number;
  peerRow: number;
  peerCol: number;
  value: number;
  type: 'row' | 'col' | 'box';
}

export interface ValidationResult {
  isValid: boolean;
  isComplete: boolean;
  conflicts: CellConflict[];
}

export type AlgorithmType =
  | 'basic'
  | 'mrv'
  | 'mrv-degree'
  | 'forward-checking'
  | 'ac3'
  | 'bitmask-optimized'
  | 'dlx';

export type SolverEventType =
  | 'SELECT_CELL'
  | 'CONSIDER_CANDIDATES'
  | 'TRY_VALUE'
  | 'PROPAGATE'
  | 'PRUNE_DOMAIN'
  | 'BACKTRACK'
  | 'SOLVED'
  | 'UNSOLVABLE';

export interface SolverEvent {
  id: number;
  type: SolverEventType;
  row: number;
  col: number;
  value?: number;
  candidates?: number[];
  remainingDomainSize?: number;
  message: string;
  boardSnapshot: Board;
}

export interface SolverStats {
  steps: number;
  backtracks: number;
  nodesVisited: number;
  timeMs: number;
  solved: boolean;
  solutionsCount?: number;
}

export interface SolveResult {
  solved: boolean;
  solution: Board | null;
  stats: SolverStats;
  events?: SolverEvent[];
}

export interface CellState {
  value: number;
  isInitial: boolean;
  notes: Set<number>;
  status?: 'idle' | 'selected' | 'highlighted' | 'same-digit' | 'trying' | 'backtracking' | 'conflict' | 'fixed';
}

export interface BenchmarkResult {
  algorithm: AlgorithmType;
  algorithmName: string;
  puzzleName: string;
  difficulty: string;
  steps: number;
  backtracks: number;
  timeMs: number;
  solved: boolean;
}

// Puzzle Generation Types
export type PuzzleDifficulty = 'Easy' | 'Medium' | 'Hard' | 'Evil';

export interface GeneratedPuzzle {
  board: Board;
  solution: Board;
  difficulty: PuzzleDifficulty;
  cluesCount: number;
  techniquesUsed: string[];
  symmetry: 'rotational180' | 'horizontal' | 'random';
}

// Web Worker RPC Protocol
export type WorkerRequest =
  | {
      type: 'SOLVE';
      taskId: string;
      board: Board;
      algorithm: AlgorithmType;
    }
  | {
      type: 'GENERATE_TIMELINE';
      taskId: string;
      board: Board;
      algorithm: AlgorithmType;
      maxEvents: number;
      batchSize?: number;
    }
  | {
      type: 'GENERATE_PUZZLE';
      taskId: string;
      difficulty: PuzzleDifficulty;
    }
  | {
      type: 'CANCEL';
      taskId: string;
    };

export type WorkerResponse =
  | {
      type: 'SOLVE_SUCCESS';
      taskId: string;
      result: SolveResult;
    }
  | {
      type: 'TIMELINE_BATCH';
      taskId: string;
      batch: SolverEvent[];
      isComplete: boolean;
      totalSoFar: number;
    }
  | {
      type: 'GENERATE_PUZZLE_SUCCESS';
      taskId: string;
      puzzle: GeneratedPuzzle;
    }
  | {
      type: 'ERROR';
      taskId: string;
      error: string;
    }
  | {
      type: 'CANCELLED';
      taskId: string;
    };
