import { Board, BenchmarkResult, AlgorithmType } from './types';
import { solveBasicBacktracking } from './solver-basic';
import {
  solveMRV,
  solveMRVDegreeLCV,
  solveForwardChecking,
  solveBitmaskOptimized,
} from './solver-optimized';
import { solveAC3 } from './solvers/ac3';
import { solveDLX } from './solvers/dlx';
import { PUZZLE_PRESETS } from './puzzles';
import { parseBoardString, cloneBoard } from './board';

export function runBenchmarkOnBoard(
  board: Board,
  puzzleName: string = 'Current Grid',
  difficulty: string = 'Active'
): BenchmarkResult[] {
  const algorithms: { type: AlgorithmType; name: string; runner: (b: Board) => any }[] = [
    {
      type: 'basic',
      name: 'Naive Backtracking (DFS)',
      runner: b => solveBasicBacktracking(b, 200_000),
    },
    {
      type: 'mrv',
      name: 'MRV Heuristic',
      runner: b => solveMRV(b, 200_000),
    },
    {
      type: 'mrv-degree',
      name: 'MRV + Degree + LCV',
      runner: b => solveMRVDegreeLCV(b, 200_000),
    },
    {
      type: 'forward-checking',
      name: 'Forward Checking',
      runner: b => solveForwardChecking(b, 200_000),
    },
    {
      type: 'ac3',
      name: 'AC-3 (Arc Consistency)',
      runner: b => solveAC3(b, 200_000),
    },
    {
      type: 'dlx',
      name: 'Knuth Dancing Links (DLX)',
      runner: b => solveDLX(b, 1),
    },
    {
      type: 'bitmask-optimized',
      name: 'Bitmask Constraint Solver',
      runner: b => solveBitmaskOptimized(b, 200_000),
    },
  ];

  const results: BenchmarkResult[] = [];

  for (const algo of algorithms) {
    const start = performance.now();
    const res = algo.runner(cloneBoard(board));
    const elapsed = performance.now() - start;

    results.push({
      algorithm: algo.type,
      algorithmName: algo.name,
      puzzleName,
      difficulty,
      steps: res.stats.steps,
      backtracks: res.stats.backtracks,
      timeMs: Number(elapsed.toFixed(2)),
      solved: res.solved,
    });
  }

  return results;
}

export function runFullPresetBenchmark(): BenchmarkResult[] {
  const allResults: BenchmarkResult[] = [];
  for (const preset of PUZZLE_PRESETS.filter(p => p.difficulty !== 'Unsolvable')) {
    const board = parseBoardString(preset.boardString);
    const results = runBenchmarkOnBoard(board, preset.name, preset.difficulty);
    allResults.push(...results);
  }
  return allResults;
}
