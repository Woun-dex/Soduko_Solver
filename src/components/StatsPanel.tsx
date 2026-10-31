import React from 'react';
import { SolverEvent } from '../engine/types';
import { Activity, Check, AlertCircle } from 'lucide-react';

interface StatsPanelProps {
  currentEvent: SolverEvent | null;
  stepCount: number;
  backtrackCount: number;
  isSolved: boolean;
  isUnsolvable: boolean;
  isVisualizing: boolean;
  isWorkerActive: boolean;
  workerEventThroughput?: number;
}

export const StatsPanel: React.FC<StatsPanelProps> = ({
  currentEvent,
  stepCount,
  backtrackCount,
  isSolved,
  isUnsolvable,
  isVisualizing,
}) => {
  const statusAnnouncement = isSolved
    ? 'Sudoku puzzle successfully solved.'
    : isUnsolvable
    ? 'Puzzle is unsolvable.'
    : isVisualizing
    ? `Solving in progress. Step ${stepCount}`
    : 'Grid ready.';

  return (
    <div className="flex flex-col gap-3 bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-4 shadow-sm select-none">
      <div role="status" aria-live="polite" className="sr-only">
        {statusAnnouncement}
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-zinc-400" />
          Telemetry
        </h3>

        {/* State Badge */}
        {isSolved ? (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 font-mono">
            <Check className="w-3 h-3" /> Solved
          </span>
        ) : isUnsolvable ? (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-950/60 text-rose-400 border border-rose-800/60 font-mono">
            <AlertCircle className="w-3 h-3" /> Unsolvable
          </span>
        ) : isVisualizing ? (
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-zinc-800 text-zinc-300 border border-zinc-700 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
            Active
          </span>
        ) : (
          <span className="text-[11px] text-zinc-500 font-mono">
            Idle
          </span>
        )}
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-2 font-mono">
        <div className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-800">
          <div className="text-[10px] text-zinc-500 uppercase">Steps</div>
          <div className="text-xl font-light text-zinc-200 mt-0.5">{stepCount}</div>
        </div>

        <div className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-800">
          <div className="text-[10px] text-zinc-500 uppercase">Backtracks</div>
          <div className="text-xl font-light text-zinc-200 mt-0.5">{backtrackCount}</div>
        </div>
      </div>

      {/* Decision Log */}
      <div className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-800 font-mono text-[11px] min-h-[44px] flex items-center text-zinc-400">
        {currentEvent ? (
          <span className="text-zinc-300 leading-snug">{currentEvent.message}</span>
        ) : (
          <span className="text-zinc-600">Select cell to input or press "Visualize".</span>
        )}
      </div>
    </div>
  );
};
