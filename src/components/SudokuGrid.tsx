import React from 'react';
import { Board, CellCoord, CellConflict, SolverEvent } from '../engine/types';
import { BOX_SIZE } from '../engine/board';

interface SudokuGridProps {
  board: Board;
  initialBoard: Board;
  notes: Map<string, Set<number>>;
  selectedCell: CellCoord | null;
  conflicts: CellConflict[];
  currentEvent: SolverEvent | null;
  onCellClick: (row: number, col: number) => void;
  isVisualizing: boolean;
}

export const SudokuGrid: React.FC<SudokuGridProps> = ({
  board,
  initialBoard,
  notes,
  selectedCell,
  conflicts,
  currentEvent,
  onCellClick,
  isVisualizing,
}) => {
  const conflictCellKeys = new Set(
    conflicts.flatMap(c => [`${c.row},${c.col}`, `${c.peerRow},${c.peerCol}`])
  );

  const selectedValue =
    selectedCell && board[selectedCell.row][selectedCell.col] !== 0
      ? board[selectedCell.row][selectedCell.col]
      : null;

  return (
    <div
      role="region"
      aria-label="Sudoku Board 9 by 9 Grid"
      className="w-full max-w-[480px] sm:max-w-[500px] mx-auto select-none"
    >
      {/* 9x9 Strict Square Grid with crisp block dividers */}
      <div
        role="grid"
        aria-label="Sudoku Matrix"
        aria-multiselectable="false"
        className="grid grid-cols-9 grid-rows-9 aspect-square w-full bg-zinc-950 rounded-xl overflow-hidden border-2 border-zinc-600 shadow-2xl"
      >
        {board.map((row, r) =>
          row.map((val, c) => {
            const isInitial = initialBoard[r][c] !== 0;
            const isSelected = selectedCell?.row === r && selectedCell?.col === c;
            const isSameRow = selectedCell?.row === r;
            const isSameCol = selectedCell?.col === c;
            const isSameBox =
              selectedCell &&
              Math.floor(selectedCell.row / BOX_SIZE) === Math.floor(r / BOX_SIZE) &&
              Math.floor(selectedCell.col / BOX_SIZE) === Math.floor(c / BOX_SIZE);

            const isPeer = (isSameRow || isSameCol || isSameBox) && !isSelected;
            const isSameDigit = selectedValue !== null && val === selectedValue && !isSelected;
            const hasConflict = conflictCellKeys.has(`${r},${c}`);

            // Visualizer events
            const isEventCell = currentEvent && currentEvent.row === r && currentEvent.col === c;
            const isTrying = isEventCell && currentEvent.type === 'TRY_VALUE';
            const isBacktracking = isEventCell && currentEvent.type === 'BACKTRACK';
            const isSelectedBySolver = isEventCell && currentEvent.type === 'SELECT_CELL';

            // Clean, architectural dividers (standard 1px vs 3x3 block 2px lines)
            const borderRight =
              c === 8
                ? ''
                : (c + 1) % 3 === 0
                ? 'border-r-2 border-r-zinc-600'
                : 'border-r border-r-zinc-800/80';

            const borderBottom =
              r === 8
                ? ''
                : (r + 1) % 3 === 0
                ? 'border-b-2 border-b-zinc-600'
                : 'border-b border-b-zinc-800/80';

            // Minimalist backgrounds
            let cellBg = 'bg-zinc-900/60';
            if (isSelected) {
              cellBg = 'bg-zinc-800 ring-2 ring-zinc-300 ring-inset z-10';
            } else if (isTrying) {
              cellBg = 'bg-amber-500/25 ring-1 ring-amber-400 ring-inset z-10';
            } else if (isBacktracking) {
              cellBg = 'bg-rose-500/25 ring-1 ring-rose-400 ring-inset z-10';
            } else if (isSelectedBySolver) {
              cellBg = 'bg-sky-500/20 ring-1 ring-sky-400 ring-inset z-10';
            } else if (hasConflict) {
              cellBg = 'bg-rose-950/40 ring-1 ring-rose-500/50 ring-inset';
            } else if (isSameDigit) {
              cellBg = 'bg-zinc-800/90';
            } else if (isPeer) {
              cellBg = 'bg-zinc-900/90';
            }

            // Minimalist typography
            let textColor = 'text-zinc-200 font-light';
            if (hasConflict) {
              textColor = 'text-rose-400 font-semibold';
            } else if (isInitial) {
              textColor = 'text-zinc-100 font-semibold';
            } else if (isTrying) {
              textColor = 'text-amber-300 font-medium';
            } else if (isBacktracking) {
              textColor = 'text-rose-400 font-medium';
            } else if (val > 0) {
              textColor = 'text-sky-400 font-normal';
            }

            const cellKey = `${r},${c}`;
            const cellNotes = notes.get(cellKey);

            const accessibleLabel = `Row ${r + 1}, Column ${c + 1}${
              val > 0 ? `, value ${val}` : ', empty'
            }${isInitial ? ', initial clue' : ''}${hasConflict ? ', conflict' : ''}`;

            return (
              <button
                key={cellKey}
                type="button"
                role="gridcell"
                aria-colindex={c + 1}
                aria-selected={isSelected}
                aria-invalid={hasConflict}
                aria-readonly={isInitial}
                aria-label={accessibleLabel}
                tabIndex={isSelected ? 0 : -1}
                onClick={() => onCellClick(r, c)}
                disabled={isVisualizing}
                className={`relative flex items-center justify-center w-full h-full aspect-square text-xl sm:text-2xl lg:text-[26px] font-mono select-none transition-colors duration-100 focus:outline-none ${borderRight} ${borderBottom} ${cellBg} ${textColor} hover:brightness-125`}
              >
                {val !== 0 ? (
                  <span className="leading-none">{val}</span>
                ) : cellNotes && cellNotes.size > 0 ? (
                  <div className="grid grid-cols-3 grid-rows-3 w-full h-full p-1 pointer-events-none text-[8px] sm:text-[10px] text-zinc-500 font-mono leading-none">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                      <span
                        key={num}
                        className={`flex items-center justify-center ${
                          cellNotes.has(num) ? 'text-zinc-300 font-medium' : 'text-transparent'
                        }`}
                      >
                        {num}
                      </span>
                    ))}
                  </div>
                ) : null}

                {/* Subtle initial clue indicator in top-left */}
                {isInitial && (
                  <span
                    aria-hidden="true"
                    className="absolute top-1 left-1 w-1 h-1 rounded-full bg-zinc-500/50"
                  />
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
