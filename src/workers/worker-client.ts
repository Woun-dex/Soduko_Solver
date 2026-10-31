import {
  Board,
  AlgorithmType,
  SolveResult,
  SolverEvent,
  GeneratedPuzzle,
  PuzzleDifficulty,
  WorkerResponse,
} from '../engine/types';
import { solveWithAlgorithm } from '../engine/solver-optimized';
import { generateSolverTimeline } from '../engine/solver-visualizer';
import { generatePuzzle } from '../engine/generator';

type TaskCallback = (response: WorkerResponse) => void;

class SolverWorkerClient {
  private worker: Worker | null = null;
  private callbacks = new Map<string, TaskCallback>();
  private taskIdCounter = 0;

  constructor() {
    this.initWorker();
  }

  private initWorker() {
    if (typeof window !== 'undefined' && typeof Worker !== 'undefined') {
      try {
        this.worker = new Worker(
          new URL('./solver.worker.ts', import.meta.url),
          { type: 'module' }
        );

        this.worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
          const res = e.data;
          const cb = this.callbacks.get(res.taskId);
          if (cb) {
            cb(res);
            if (
              res.type === 'SOLVE_SUCCESS' ||
              res.type === 'GENERATE_PUZZLE_SUCCESS' ||
              res.type === 'ERROR' ||
              res.type === 'CANCELLED' ||
              (res.type === 'TIMELINE_BATCH' && res.isComplete)
            ) {
              this.callbacks.delete(res.taskId);
            }
          }
        };

        this.worker.onerror = err => {
          console.error('Worker error:', err);
        };
      } catch (e) {
        console.warn('Web Workers unavailable or blocked, falling back to sync execution:', e);
        this.worker = null;
      }
    }
  }

  private nextTaskId(): string {
    return `task_${Date.now()}_${++this.taskIdCounter}`;
  }

  public cancel(taskId: string): void {
    if (this.worker) {
      this.worker.postMessage({ type: 'CANCEL', taskId });
    }
    this.callbacks.delete(taskId);
  }

  public solveAsync(board: Board, algorithm: AlgorithmType): Promise<SolveResult> {
    const taskId = this.nextTaskId();

    if (!this.worker) {
      // Fallback
      return Promise.resolve(solveWithAlgorithm(board, algorithm));
    }

    return new Promise((resolve, reject) => {
      this.callbacks.set(taskId, res => {
        if (res.type === 'SOLVE_SUCCESS') {
          resolve(res.result);
        } else if (res.type === 'ERROR') {
          reject(new Error(res.error));
        } else if (res.type === 'CANCELLED') {
          reject(new Error('Solver task cancelled'));
        }
      });

      this.worker!.postMessage({
        type: 'SOLVE',
        taskId,
        board,
        algorithm,
      });
    });
  }

  public streamTimeline(
    board: Board,
    algorithm: AlgorithmType,
    onBatch: (events: SolverEvent[], totalSoFar: number) => void,
    maxEvents: number = 20_000,
    batchSize: number = 100
  ): { taskId: string; promise: Promise<void> } {
    const taskId = this.nextTaskId();

    if (!this.worker) {
      // Synchronous fallback
      const events = generateSolverTimeline(board, algorithm, maxEvents);
      onBatch(events, events.length);
      return { taskId, promise: Promise.resolve() };
    }

    const promise = new Promise<void>((resolve, reject) => {
      this.callbacks.set(taskId, res => {
        if (res.type === 'TIMELINE_BATCH') {
          onBatch(res.batch, res.totalSoFar);
          if (res.isComplete) resolve();
        } else if (res.type === 'ERROR') {
          reject(new Error(res.error));
        } else if (res.type === 'CANCELLED') {
          resolve(); // Clean early exit on cancel
        }
      });

      this.worker!.postMessage({
        type: 'GENERATE_TIMELINE',
        taskId,
        board,
        algorithm,
        maxEvents,
        batchSize,
      });
    });

    return { taskId, promise };
  }

  public generatePuzzleAsync(difficulty: PuzzleDifficulty): Promise<GeneratedPuzzle> {
    const taskId = this.nextTaskId();

    if (!this.worker) {
      return Promise.resolve(generatePuzzle(difficulty));
    }

    return new Promise((resolve, reject) => {
      this.callbacks.set(taskId, res => {
        if (res.type === 'GENERATE_PUZZLE_SUCCESS') {
          resolve(res.puzzle);
        } else if (res.type === 'ERROR') {
          reject(new Error(res.error));
        } else if (res.type === 'CANCELLED') {
          reject(new Error('Puzzle generation cancelled'));
        }
      });

      this.worker!.postMessage({
        type: 'GENERATE_PUZZLE',
        taskId,
        difficulty,
      });
    });
  }

  public terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.callbacks.clear();
    }
  }
}

export const solverWorkerClient = new SolverWorkerClient();

