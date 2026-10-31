import React from 'react';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  RotateCcw,
  Sliders,
  BarChart2,
  Sparkles,
} from 'lucide-react';
import { AlgorithmType, PuzzleDifficulty } from '../engine/types';
import { PUZZLE_PRESETS } from '../engine/puzzles';

interface ControlsProps {
  algorithm: AlgorithmType;
  onAlgorithmChange: (algo: AlgorithmType) => void;
  selectedPresetId: string;
  onPresetChange: (presetId: string) => void;
  onClearBoard: () => void;
  // Puzzle generator
  onGeneratePuzzle: (difficulty: PuzzleDifficulty) => void;
  isGeneratingPuzzle: boolean;
  // Visualizer controls
  isVisualizing: boolean;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onStepForward: () => void;
  onStepBackward: () => void;
  onResetVisualization: () => void;
  onInstantSolve: () => void;
  speedMs: number;
  onSpeedChange: (speed: number) => void;
  // Timeline scrubber
  currentStepIndex: number;
  totalSteps: number;
  onScrubTimeline: (stepIndex: number) => void;
  // Benchmark
  onOpenBenchmark: () => void;
  isWorkerActive: boolean;
}

export const Controls: React.FC<ControlsProps> = ({
  algorithm,
  onAlgorithmChange,
  selectedPresetId,
  onPresetChange,
  onClearBoard,
  onGeneratePuzzle,
  isGeneratingPuzzle,
  isVisualizing,
  isPlaying,
  onTogglePlay,
  onStepForward,
  onStepBackward,
  onResetVisualization,
  onInstantSolve,
  speedMs,
  onSpeedChange,
  currentStepIndex,
  totalSteps,
  onScrubTimeline,
  onOpenBenchmark,
  isWorkerActive,
}) => {
  return (
    <div className="flex flex-col gap-3.5 bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-4 shadow-sm select-none">
      {/* Top: Preset Selector & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 border-b border-zinc-800/80">
        <div className="flex items-center gap-2 flex-1 min-w-[180px]">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Puzzle
          </span>
          <select
            value={selectedPresetId}
            onChange={e => onPresetChange(e.target.value)}
            disabled={isVisualizing || isGeneratingPuzzle}
            className="bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs rounded-lg px-2.5 py-1.5 focus:border-zinc-600 focus:outline-none flex-1 transition"
          >
            {PUZZLE_PRESETS.map(preset => (
              <option key={preset.id} value={preset.id}>
                {preset.name} ({preset.difficulty})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onClearBoard}
            disabled={isVisualizing || isGeneratingPuzzle}
            className="text-xs px-2.5 py-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 transition"
          >
            Clear
          </button>

          <button
            type="button"
            onClick={onOpenBenchmark}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 transition font-medium"
          >
            <BarChart2 className="w-3.5 h-3.5 text-zinc-400" />
            <span>Benchmark</span>
          </button>
        </div>
      </div>

      {/* Generator Row: Minimalist Difficulty Pills */}
      <div className="flex items-center justify-between gap-2 py-0.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
          Generate
        </span>
        <div className="flex items-center gap-1">
          {(['Easy', 'Medium', 'Hard', 'Evil'] as PuzzleDifficulty[]).map(diff => (
            <button
              key={diff}
              type="button"
              onClick={() => onGeneratePuzzle(diff)}
              disabled={isVisualizing || isGeneratingPuzzle}
              className="text-xs px-2.5 py-1 rounded-md bg-zinc-950 hover:bg-zinc-800 border border-zinc-800/80 text-zinc-300 hover:text-white disabled:opacity-40 transition font-mono"
            >
              {isGeneratingPuzzle ? '...' : diff}
            </button>
          ))}
        </div>
      </div>

      {/* Algorithm Selector: Sleek Flat Grid */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Algorithm Engine
          </label>
          <span className="text-[10px] font-mono text-zinc-500">
            {isWorkerActive ? 'Thread: Worker' : 'Thread: Main'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          {[
            { id: 'dlx', label: 'Knuth DLX' },
            { id: 'ac3', label: 'AC-3 / MAC' },
            { id: 'bitmask-optimized', label: 'Bitmask' },
            { id: 'forward-checking', label: 'Fwd Check' },
            { id: 'mrv', label: 'MRV' },
            { id: 'mrv-degree', label: 'MRV+Degree' },
            { id: 'basic', label: 'Naive DFS' },
          ].map(algo => (
            <button
              key={algo.id}
              type="button"
              onClick={() => onAlgorithmChange(algo.id as AlgorithmType)}
              disabled={isVisualizing && isPlaying}
              className={`py-1.5 px-2 rounded-lg border text-center transition font-mono text-xs ${
                algorithm === algo.id
                  ? 'bg-zinc-200 border-zinc-100 text-zinc-950 font-medium'
                  : 'bg-zinc-950 hover:bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {algo.label}
            </button>
          ))}
        </div>
      </div>

      {/* Visualizer Controls */}
      <div className="flex flex-col gap-2.5 pt-2 border-t border-zinc-800/80">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onTogglePlay}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition ${
                isPlaying
                  ? 'bg-amber-600 hover:bg-amber-500 text-white'
                  : 'bg-zinc-100 hover:bg-white text-zinc-950'
              }`}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>{isPlaying ? 'Pause' : isVisualizing ? 'Resume' : 'Visualize'}</span>
            </button>

            <button
              type="button"
              onClick={onStepBackward}
              disabled={isPlaying || currentStepIndex <= 0}
              className="p-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 disabled:opacity-30 transition"
              title="Step Backward"
            >
              <SkipBack className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={onStepForward}
              disabled={isPlaying}
              className="p-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 disabled:opacity-30 transition"
              title="Step Forward"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={onResetVisualization}
              disabled={!isVisualizing}
              className="p-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 disabled:opacity-30 transition"
              title="Reset"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={onInstantSolve}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-xs font-medium transition"
          >
            <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
            <span>Instant</span>
          </button>
        </div>

        {/* Speed Slider */}
        <div className="flex items-center gap-2.5 bg-zinc-950 px-3 py-2 rounded-lg border border-zinc-800">
          <Sliders className="w-3.5 h-3.5 text-zinc-500" />
          <span className="text-[11px] text-zinc-400 font-mono min-w-[55px]">
            {speedMs}ms
          </span>
          <input
            type="range"
            min="5"
            max="300"
            step="5"
            value={speedMs}
            onChange={e => onSpeedChange(Number(e.target.value))}
            className="flex-1 accent-zinc-200 h-1 bg-zinc-800 rounded-lg cursor-pointer"
          />
        </div>

        {/* Timeline Scrubber */}
        {totalSteps > 0 && (
          <div className="flex flex-col gap-1 bg-zinc-950 px-3 py-2 rounded-lg border border-zinc-800">
            <div className="flex justify-between text-[11px] text-zinc-400 font-mono">
              <span>Step</span>
              <span>
                {currentStepIndex + 1} / {totalSteps}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max={totalSteps - 1}
              value={currentStepIndex}
              onChange={e => onScrubTimeline(Number(e.target.value))}
              disabled={isPlaying}
              className="accent-zinc-200 h-1 bg-zinc-800 rounded-lg cursor-pointer w-full"
            />
          </div>
        )}
      </div>
    </div>
  );
};
