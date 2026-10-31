import React from 'react';
import { Delete, Edit3, RotateCcw, RotateCw, Sparkles } from 'lucide-react';

interface NumpadProps {
  onNumberInput: (num: number) => void;
  onErase: () => void;
  isNotesMode: boolean;
  onToggleNotesMode: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onAutoFillNotes: () => void;
  disabled: boolean;
}

export const Numpad: React.FC<NumpadProps> = ({
  onNumberInput,
  onErase,
  isNotesMode,
  onToggleNotesMode,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onAutoFillNotes,
  disabled,
}) => {
  return (
    <div className="flex flex-col gap-2.5 w-full max-w-[480px] sm:max-w-[500px] mx-auto select-none">
      {/* Action Toolbar */}
      <div className="grid grid-cols-5 gap-1.5">
        <button
          type="button"
          onClick={onUndo}
          disabled={disabled || !canUndo}
          className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 disabled:opacity-30 disabled:pointer-events-none transition text-xs font-medium"
          title="Undo (Ctrl+Z)"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Undo</span>
        </button>

        <button
          type="button"
          onClick={onRedo}
          disabled={disabled || !canRedo}
          className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 disabled:opacity-30 disabled:pointer-events-none transition text-xs font-medium"
          title="Redo (Ctrl+Y)"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>Redo</span>
        </button>

        <button
          type="button"
          onClick={onToggleNotesMode}
          disabled={disabled}
          className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border transition text-xs font-medium ${
            isNotesMode
              ? 'bg-zinc-200 border-zinc-100 text-zinc-900 shadow-sm'
              : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-300'
          }`}
          title="Toggle Candidate Notes (N)"
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span>Notes</span>
        </button>

        <button
          type="button"
          onClick={onAutoFillNotes}
          disabled={disabled}
          className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 disabled:opacity-30 transition text-xs font-medium"
          title="Auto-fill candidate notes"
        >
          <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
          <span className="hidden sm:inline">Auto Notes</span>
          <span className="sm:hidden">Auto</span>
        </button>

        <button
          type="button"
          onClick={onErase}
          disabled={disabled}
          className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-zinc-900 hover:bg-rose-950/30 hover:border-rose-900/40 border border-zinc-800 text-zinc-300 hover:text-rose-300 transition text-xs font-medium"
          title="Erase cell (Backspace)"
        >
          <Delete className="w-3.5 h-3.5" />
          <span>Clear</span>
        </button>
      </div>

      {/* Number Grid: 1 to 9 */}
      <div className="grid grid-cols-9 gap-1.5">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
          <button
            key={num}
            type="button"
            onClick={() => onNumberInput(num)}
            disabled={disabled}
            className="flex items-center justify-center aspect-square rounded-lg bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-700 text-zinc-100 font-mono text-xl sm:text-2xl font-light border border-zinc-800/80 transition disabled:opacity-30"
          >
            {num}
          </button>
        ))}
      </div>
    </div>
  );
};
