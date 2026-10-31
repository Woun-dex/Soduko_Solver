import { WorkerRequest, WorkerResponse } from '../engine/types';
import { solveWithAlgorithm } from '../engine/solver-optimized';
import { createSolverGenerator } from '../engine/solver-visualizer';
import { generatePuzzle } from '../engine/generator';

const cancelledTasks = new Set<string>();

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const req = event.data;

  if (req.type === 'CANCEL') {
    cancelledTasks.add(req.taskId);
    self.postMessage({ type: 'CANCELLED', taskId: req.taskId } as WorkerResponse);
    return;
  }

  if (req.type === 'SOLVE') {
    try {
      const result = solveWithAlgorithm(req.board, req.algorithm);
      self.postMessage({
        type: 'SOLVE_SUCCESS',
        taskId: req.taskId,
        result,
      } as WorkerResponse);
    } catch (err: any) {
      self.postMessage({
        type: 'ERROR',
        taskId: req.taskId,
        error: err.message || 'Solver error',
      } as WorkerResponse);
    }
    return;
  }

  if (req.type === 'GENERATE_TIMELINE') {
    try {
      const generator = createSolverGenerator(req.board, req.algorithm, req.maxEvents);
      const batchSize = req.batchSize || 100;
      let currentBatch: any[] = [];
      let totalEmitted = 0;

      let next = generator.next();
      while (!next.done) {
        if (cancelledTasks.has(req.taskId)) {
          cancelledTasks.delete(req.taskId);
          self.postMessage({ type: 'CANCELLED', taskId: req.taskId } as WorkerResponse);
          return;
        }

        currentBatch.push(next.value);
        totalEmitted++;

        if (currentBatch.length >= batchSize) {
          self.postMessage({
            type: 'TIMELINE_BATCH',
            taskId: req.taskId,
            batch: currentBatch,
            isComplete: false,
            totalSoFar: totalEmitted,
          } as WorkerResponse);
          currentBatch = [];
        }

        next = generator.next();
      }

      // Final remaining batch
      self.postMessage({
        type: 'TIMELINE_BATCH',
        taskId: req.taskId,
        batch: currentBatch,
        isComplete: true,
        totalSoFar: totalEmitted,
      } as WorkerResponse);
    } catch (err: any) {
      self.postMessage({
        type: 'ERROR',
        taskId: req.taskId,
        error: err.message || 'Timeline generation error',
      } as WorkerResponse);
    }
    return;
  }

  if (req.type === 'GENERATE_PUZZLE') {
    try {
      const puzzle = generatePuzzle(req.difficulty);
      self.postMessage({
        type: 'GENERATE_PUZZLE_SUCCESS',
        taskId: req.taskId,
        puzzle,
      } as WorkerResponse);
    } catch (err: any) {
      self.postMessage({
        type: 'ERROR',
        taskId: req.taskId,
        error: err.message || 'Puzzle generation error',
      } as WorkerResponse);
    }
    return;
  }
};

