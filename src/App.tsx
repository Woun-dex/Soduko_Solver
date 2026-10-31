import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Board, CellCoord, AlgorithmType, SolverEvent, PuzzleDifficulty } from './engine/types';
import {
  createEmptyBoard,
  cloneBoard,
  parseBoardString,
  validateBoard,
} from './engine/board';
import { PUZZLE_PRESETS } from './engine/puzzles';
import { solverWorkerClient } from './workers/worker-client';
import { SudokuGrid } from './components/SudokuGrid';
import { Numpad } from './components/Numpad';
import { Controls } from './components/Controls';
import { StatsPanel } from './components/StatsPanel';
import { BenchmarkModal } from './components/BenchmarkModal';
import { BookOpen } from 'lucide-react';

interface HistorySnapshot {
  board: Board;
}

export const App: React.FC = () => {
  // Preset & Board state
  const [selectedPresetId, setSelectedPresetId] = useState<string>('easy-1');
  const [initialBoard, setInitialBoard] = useState<Board>(() =>
    parseBoardString(PUZZLE_PRESETS[0].boardString)
  );
  const [board, setBoard] = useState<Board>(() =>
    parseBoardString(PUZZLE_PRESETS[0].boardString)
  );

  const [selectedCell, setSelectedCell] = useState<CellCoord | null>({ row: 0, col: 0 });

  // History Stacks (Undo / Redo)
  const [undoStack, setUndoStack] = useState<HistorySnapshot[]>([]);
  const [redoStack, setRedoStack] = useState<HistorySnapshot[]>([]);

  // Algorithm & Visualizer State
  const [algorithm, setAlgorithm] = useState<AlgorithmType>('dlx');
  const [isVisualizing, setIsVisualizing] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speedMs, setSpeedMs] = useState<number>(30);

  // Worker & Streaming Timeline
  const [timelineEvents, setTimelineEvents] = useState<SolverEvent[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(-1);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [isWorkerActive] = useState<boolean>(typeof window !== 'undefined' && typeof Worker !== 'undefined');

  // Generator State
  const [isGeneratingPuzzle, setIsGeneratingPuzzle] = useState<boolean>(false);

  // Status flags
  const [isSolved, setIsSolved] = useState<boolean>(false);
  const [isUnsolvable, setIsUnsolvable] = useState<boolean>(false);

  // Benchmark Modal
  const [isBenchmarkOpen, setIsBenchmarkOpen] = useState<boolean>(false);

  // Playback timer ref
  const playbackTimerRef = useRef<number | null>(null);

  // Conflicts calculation
  const validation = validateBoard(board);
  const conflicts = validation.conflicts;

  const pushHistory = useCallback(() => {
    setUndoStack(prev => [...prev, { board: cloneBoard(board) }]);
    setRedoStack([]);
  }, [board]);

  // Load Preset
  const handlePresetChange = (presetId: string) => {
    const preset = PUZZLE_PRESETS.find(p => p.id === presetId);
    if (!preset) return;

    setSelectedPresetId(presetId);
    const parsed = parseBoardString(preset.boardString);
    setInitialBoard(cloneBoard(parsed));
    setBoard(cloneBoard(parsed));
    setUndoStack([]);
    setRedoStack([]);
    resetVisualizer();
  };

  // Generate Unique Puzzle
  const handleGeneratePuzzle = async (difficulty: PuzzleDifficulty) => {
    setIsGeneratingPuzzle(true);
    resetVisualizer();
    try {
      const generated = await solverWorkerClient.generatePuzzleAsync(difficulty);
      setInitialBoard(cloneBoard(generated.board));
      setBoard(cloneBoard(generated.board));
      setSelectedPresetId('custom-generated');
      setUndoStack([]);
      setRedoStack([]);
    } catch (e) {
      console.error('Failed to generate puzzle:', e);
    } finally {
      setIsGeneratingPuzzle(false);
    }
  };

  // Clear Board
  const handleClearBoard = () => {
    const empty = createEmptyBoard();
    setInitialBoard(empty);
    setBoard(empty);
    setUndoStack([]);
    setRedoStack([]);
    resetVisualizer();
  };

  // Reset visualizer state
  const resetVisualizer = () => {
    if (activeTaskId) {
      solverWorkerClient.cancel(activeTaskId);
      setActiveTaskId(null);
    }
    if (playbackTimerRef.current) {
      clearInterval(playbackTimerRef.current);
      playbackTimerRef.current = null;
    }
    setIsVisualizing(false);
    setIsPlaying(false);
    setTimelineEvents([]);
    setCurrentStepIndex(-1);
    setIsSolved(false);
    setIsUnsolvable(false);
    setBoard(cloneBoard(initialBoard));
  };

  // Cell Value Input
  const handleNumberInput = (num: number) => {
    if (!selectedCell || isVisualizing) return;
    const { row, col } = selectedCell;

    if (initialBoard[row][col] !== 0) return;

    pushHistory();

    setBoard(prev => {
      const next = cloneBoard(prev);
      next[row][col] = next[row][col] === num ? 0 : num;
      return next;
    });
  };

  // Erase Cell
  const handleErase = () => {
    if (!selectedCell || isVisualizing) return;
    const { row, col } = selectedCell;
    if (initialBoard[row][col] !== 0) return;

    pushHistory();

    setBoard(prev => {
      const next = cloneBoard(prev);
      next[row][col] = 0;
      return next;
    });
  };

  // Undo / Redo
  const handleUndo = useCallback(() => {
    if (undoStack.length === 0 || isVisualizing) return;
    const previous = undoStack[undoStack.length - 1];
    setRedoStack(prev => [...prev, { board: cloneBoard(board) }]);
    setUndoStack(prev => prev.slice(0, -1));
    setBoard(cloneBoard(previous.board));
  }, [undoStack, board, isVisualizing]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0 || isVisualizing) return;
    const nextSnapshot = redoStack[redoStack.length - 1];
    setUndoStack(prev => [...prev, { board: cloneBoard(board) }]);
    setRedoStack(prev => prev.slice(0, -1));
    setBoard(cloneBoard(nextSnapshot.board));
  }, [redoStack, board, isVisualizing]);

  // Start Visualization with Worker Streaming & Backpressure
  const handleTogglePlay = () => {
    if (!isVisualizing) {
      setIsVisualizing(true);
      setIsPlaying(true);
      setCurrentStepIndex(0);

      const { taskId } = solverWorkerClient.streamTimeline(
        board,
        algorithm,
        (batch, _totalSoFar) => {
          setTimelineEvents(prev => [...prev, ...batch]);
        },
        20_000,
        100
      );
      setActiveTaskId(taskId);
    } else {
      setIsPlaying(prev => !prev);
    }
  };

  // Step Forward / Backward
  const handleStepForward = () => {
    if (currentStepIndex + 1 < timelineEvents.length) {
      const nextIdx = currentStepIndex + 1;
      setCurrentStepIndex(nextIdx);
      const ev = timelineEvents[nextIdx];
      setBoard(cloneBoard(ev.boardSnapshot));
      if (ev.type === 'SOLVED') setIsSolved(true);
      if (ev.type === 'UNSOLVABLE') setIsUnsolvable(true);
    }
  };

  const handleStepBackward = () => {
    if (currentStepIndex > 0) {
      const prevIdx = currentStepIndex - 1;
      setCurrentStepIndex(prevIdx);
      const ev = timelineEvents[prevIdx];
      setBoard(cloneBoard(ev.boardSnapshot));
      setIsSolved(false);
      setIsUnsolvable(false);
    }
  };

  const handleScrubTimeline = (stepIndex: number) => {
    if (stepIndex >= 0 && stepIndex < timelineEvents.length) {
      setCurrentStepIndex(stepIndex);
      const ev = timelineEvents[stepIndex];
      setBoard(cloneBoard(ev.boardSnapshot));
      setIsSolved(ev.type === 'SOLVED');
      setIsUnsolvable(ev.type === 'UNSOLVABLE');
    }
  };

  // Instant Solve via Worker
  const handleInstantSolve = async () => {
    resetVisualizer();
    try {
      const res = await solverWorkerClient.solveAsync(board, algorithm);
      if (res.solved && res.solution) {
        setBoard(res.solution);
        setIsSolved(true);
        setIsUnsolvable(false);
      } else {
        setIsUnsolvable(true);
        setIsSolved(false);
      }
    } catch (e) {
      console.error('Instant solve error:', e);
      setIsUnsolvable(true);
    }
  };

  // Visualizer Playback Loop
  useEffect(() => {
    if (isPlaying && isVisualizing) {
      playbackTimerRef.current = window.setInterval(() => {
        setCurrentStepIndex(curr => {
          const nextIdx = curr + 1;
          if (nextIdx >= timelineEvents.length) {
            return curr;
          }
          const ev = timelineEvents[nextIdx];
          setBoard(cloneBoard(ev.boardSnapshot));
          if (ev.type === 'SOLVED') {
            setIsSolved(true);
            setIsPlaying(false);
          } else if (ev.type === 'UNSOLVABLE') {
            setIsUnsolvable(true);
            setIsPlaying(false);
          }
          return nextIdx;
        });
      }, speedMs);
    } else {
      if (playbackTimerRef.current) {
        clearInterval(playbackTimerRef.current);
        playbackTimerRef.current = null;
      }
    }

    return () => {
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
    };
  }, [isPlaying, isVisualizing, timelineEvents, speedMs]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
        return;
      }

      if (e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        handleNumberInput(parseInt(e.key, 10));
        return;
      }

      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        handleErase();
        return;
      }

      if (!selectedCell) return;
      let { row, col } = selectedCell;

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        row = Math.max(0, row - 1);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        row = Math.min(8, row + 1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        col = Math.max(0, col - 1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        col = Math.min(8, col + 1);
      } else {
        return;
      }

      setSelectedCell({ row, col });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCell, isVisualizing, board, initialBoard, undoStack, redoStack, handleUndo, handleRedo]);

  const currentEvent =
    isVisualizing && currentStepIndex >= 0 && currentStepIndex < timelineEvents.length
      ? timelineEvents[currentStepIndex]
      : null;

  const backtracksSoFar = timelineEvents
    .slice(0, currentStepIndex + 1)
    .filter(e => e.type === 'BACKTRACK').length;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
      {/* Minimalist Header */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-base font-medium tracking-tight text-zinc-100">
              Sudoku Architect
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400">
              CSP & Visualizer
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex text-[11px] font-mono text-zinc-500">
              [1-9] Place • [Backspace] Clear • [Ctrl+Z] Undo • [Arrows] Move
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-6 flex-1 flex flex-col lg:flex-row gap-6 w-full items-start justify-center">
        {/* Left Column: Sudoku Grid + Numpad */}
        <div className="flex flex-col gap-3.5 w-full lg:w-auto items-center">
          <SudokuGrid
            board={board}
            initialBoard={initialBoard}
            selectedCell={selectedCell}
            conflicts={conflicts}
            currentEvent={currentEvent}
            onCellClick={(r, c) => setSelectedCell({ row: r, col: c })}
            isVisualizing={isVisualizing}
          />

          <Numpad
            onNumberInput={handleNumberInput}
            onErase={handleErase}
            onUndo={handleUndo}
            onRedo={handleRedo}
            canUndo={undoStack.length > 0}
            canRedo={redoStack.length > 0}
            disabled={isVisualizing}
          />
        </div>

        {/* Right Column: Controls & Telemetry */}
        <div className="flex flex-col gap-3.5 w-full lg:max-w-sm">
          <Controls
            algorithm={algorithm}
            onAlgorithmChange={setAlgorithm}
            selectedPresetId={selectedPresetId}
            onPresetChange={handlePresetChange}
            onClearBoard={handleClearBoard}
            onGeneratePuzzle={handleGeneratePuzzle}
            isGeneratingPuzzle={isGeneratingPuzzle}
            isVisualizing={isVisualizing}
            isPlaying={isPlaying}
            onTogglePlay={handleTogglePlay}
            onStepForward={handleStepForward}
            onStepBackward={handleStepBackward}
            onResetVisualization={resetVisualizer}
            onInstantSolve={handleInstantSolve}
            speedMs={speedMs}
            onSpeedChange={setSpeedMs}
            currentStepIndex={currentStepIndex}
            totalSteps={timelineEvents.length}
            onScrubTimeline={handleScrubTimeline}
            onOpenBenchmark={() => setIsBenchmarkOpen(true)}
            isWorkerActive={isWorkerActive}
          />

          <StatsPanel
            currentEvent={currentEvent}
            stepCount={Math.max(0, currentStepIndex + 1)}
            backtrackCount={backtracksSoFar}
            isSolved={isSolved}
            isUnsolvable={isUnsolvable}
            isVisualizing={isVisualizing}
            isWorkerActive={isWorkerActive}
          />

          {/* Minimalist Architecture Note */}
          <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-3.5 text-xs text-zinc-500 font-mono flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-zinc-400">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Engine Architecture</span>
            </div>
            <p className="text-[11px] text-zinc-500 leading-relaxed font-sans">
              Knuth DLX exact cover, AC-3 constraint propagation, Web Worker off-thread streaming with backpressure, and search-based generator with 100% verified uniqueness.
            </p>
          </div>
        </div>
      </main>

      {/* Benchmark Modal */}
      <BenchmarkModal
        isOpen={isBenchmarkOpen}
        onClose={() => setIsBenchmarkOpen(false)}
        currentBoard={board}
      />
    </div>
  );
};
