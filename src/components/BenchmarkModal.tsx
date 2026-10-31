import React, { useState } from 'react';
import { X, Play, Zap, Check, AlertCircle } from 'lucide-react';
import { Board, BenchmarkResult } from '../engine/types';
import { runBenchmarkOnBoard } from '../engine/benchmark';

interface BenchmarkModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBoard: Board;
}

export const BenchmarkModal: React.FC<BenchmarkModalProps> = ({
  isOpen,
  onClose,
  currentBoard,
}) => {
  const [results, setResults] = useState<BenchmarkResult[] | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  if (!isOpen) return null;

  const handleRun = () => {
    setIsRunning(true);
    setTimeout(() => {
      try {
        const res = runBenchmarkOnBoard(currentBoard, 'Active Grid', 'Active');
        setResults(res);
      } finally {
        setIsRunning(false);
      }
    }, 50);
  };

  const naive = results?.find(r => r.algorithm === 'basic');
  const dlx = results?.find(r => r.algorithm === 'dlx');
  const bitmask = results?.find(r => r.algorithm === 'bitmask-optimized');

  const bestAlgo = dlx || bitmask;
  const backtrackReduction =
    naive && bestAlgo && naive.backtracks > 0
      ? Math.max(0, Math.round(((naive.backtracks - bestAlgo.backtracks) / naive.backtracks) * 100))
      : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="benchmark-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none"
    >
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-zinc-400" />
            <h2 id="benchmark-title" className="text-sm font-semibold text-zinc-100 font-mono">
              Solver Benchmarks
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col gap-4 overflow-y-auto">
          <p className="text-xs text-zinc-400 leading-relaxed font-sans">
            Compares Naive Backtracking against MRV, Degree Heuristic, Forward Checking, AC-3 (Arc Consistency), Knuth's Dancing Links (DLX), and Bitmask constraint propagation.
          </p>

          <button
            type="button"
            onClick={handleRun}
            disabled={isRunning}
            className="flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 font-medium text-xs transition disabled:opacity-40"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{isRunning ? 'Running Benchmarks...' : 'Run Benchmark Comparison'}</span>
          </button>

          {/* Table */}
          {results && (
            <div className="flex flex-col gap-3 font-mono">
              <div className="overflow-x-auto rounded-lg border border-zinc-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-950 text-zinc-500 font-medium text-[10px] uppercase">
                    <tr>
                      <th className="p-2.5">Algorithm</th>
                      <th className="p-2.5">Steps</th>
                      <th className="p-2.5">Backtracks</th>
                      <th className="p-2.5">Time</th>
                      <th className="p-2.5">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/80 bg-zinc-900/50">
                    {results.map(r => (
                      <tr
                        key={r.algorithm}
                        className={
                          r.algorithm === 'dlx' || r.algorithm === 'bitmask-optimized'
                            ? 'bg-zinc-800/30'
                            : ''
                        }
                      >
                        <td className="p-2.5 text-zinc-200">{r.algorithmName}</td>
                        <td className="p-2.5 text-zinc-400">{r.steps.toLocaleString()}</td>
                        <td className="p-2.5 text-zinc-400">{r.backtracks.toLocaleString()}</td>
                        <td className="p-2.5 text-zinc-200">{r.timeMs} ms</td>
                        <td className="p-2.5">
                          {r.solved ? (
                            <span className="flex items-center gap-1 text-emerald-400">
                              <Check className="w-3.5 h-3.5" /> Solved
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-rose-400">
                              <AlertCircle className="w-3.5 h-3.5" /> Timeout
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {backtrackReduction !== null && backtrackReduction > 0 && (
                <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-300 text-xs">
                  Optimization eliminated <span className="text-white font-medium">{backtrackReduction}%</span> of the search space compared to naive DFS.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
