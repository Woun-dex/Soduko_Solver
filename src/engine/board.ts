import { Board, CellCoord, CellConflict, ValidationResult } from './types';

export const BOARD_SIZE = 9;
export const BOX_SIZE = 3;
export const ALL_BITS_MASK = 0x1ff; // 9 bits for numbers 1 to 9 (0b111111111)

/**
 * Creates an empty 9x9 board filled with 0s.
 */
export function createEmptyBoard(): Board {
  return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(0));
}

/**
 * Deep clone a board.
 */
export function cloneBoard(board: Board): Board {
  return board.map(row => [...row]);
}

/**
 * Parses an 81-character string (digits 1-9, '.' or '0' for empty) into a Board.
 */
export function parseBoardString(str: string): Board {
  const cleaned = str.replace(/[^0-9.]/g, '');
  if (cleaned.length < 81) {
    throw new Error(`Invalid board string length: expected 81, got ${cleaned.length}`);
  }
  const board = createEmptyBoard();
  for (let i = 0; i < 81; i++) {
    const char = cleaned[i];
    const row = Math.floor(i / BOARD_SIZE);
    const col = i % BOARD_SIZE;
    const num = char === '.' ? 0 : parseInt(char, 10);
    board[row][col] = isNaN(num) ? 0 : num;
  }
  return board;
}

/**
 * Serializes a board into an 81-character string.
 */
export function serializeBoard(board: Board): string {
  return board.map(row => row.map(v => (v === 0 ? '.' : v.toString())).join('')).join('');
}

/**
 * Gets the 3x3 box index (0 to 8) for a given row and column.
 */
export function getBoxIndex(row: number, col: number): number {
  return Math.floor(row / BOX_SIZE) * BOX_SIZE + Math.floor(col / BOX_SIZE);
}

/**
 * Gets the top-left coordinate of the 3x3 box for a given row and column.
 */
export function getBoxOrigin(row: number, col: number): CellCoord {
  return {
    row: Math.floor(row / BOX_SIZE) * BOX_SIZE,
    col: Math.floor(col / BOX_SIZE) * BOX_SIZE,
  };
}

/**
 * Get all 20 unique peer cell coordinates (cells in same row, column, or 3x3 box, excluding itself).
 */
export function getPeers(row: number, col: number): CellCoord[] {
  const peers: CellCoord[] = [];
  const seen = new Set<string>();

  const add = (r: number, c: number) => {
    if (r === row && c === col) return;
    const key = `${r},${c}`;
    if (!seen.has(key)) {
      seen.add(key);
      peers.push({ row: r, col: c });
    }
  };

  // Same row & column
  for (let i = 0; i < BOARD_SIZE; i++) {
    add(row, i);
    add(i, col);
  }

  // Same 3x3 box
  const boxOrigin = getBoxOrigin(row, col);
  for (let r = 0; r < BOX_SIZE; r++) {
    for (let c = 0; c < BOX_SIZE; c++) {
      add(boxOrigin.row + r, boxOrigin.col + c);
    }
  }

  return peers;
}

/**
 * Challenge 1: Validate a Sudoku board.
 * Checks rows, columns, and 3x3 subgrids. Returns detailed conflict list.
 */
export function validateBoard(board: Board): ValidationResult {
  const conflicts: CellConflict[] = [];
  let isComplete = true;

  // Track occurrences: Map of value -> array of coords
  for (let r = 0; r < BOARD_SIZE; r++) {
    const rowMap = new Map<number, number>();
    for (let c = 0; c < BOARD_SIZE; c++) {
      const val = board[r][c];
      if (val === 0) {
        isComplete = false;
        continue;
      }
      if (rowMap.has(val)) {
        const peerCol = rowMap.get(val)!;
        conflicts.push({
          row: r,
          col: c,
          peerRow: r,
          peerCol,
          value: val,
          type: 'row',
        });
      } else {
        rowMap.set(val, c);
      }
    }
  }

  // Check columns
  for (let c = 0; c < BOARD_SIZE; c++) {
    const colMap = new Map<number, number>();
    for (let r = 0; r < BOARD_SIZE; r++) {
      const val = board[r][c];
      if (val === 0) continue;
      if (colMap.has(val)) {
        const peerRow = colMap.get(val)!;
        conflicts.push({
          row: r,
          col: c,
          peerRow,
          peerCol: c,
          value: val,
          type: 'col',
        });
      } else {
        colMap.set(val, r);
      }
    }
  }

  // Check 3x3 boxes
  for (let br = 0; br < BOARD_SIZE; br += BOX_SIZE) {
    for (let bc = 0; bc < BOARD_SIZE; bc += BOX_SIZE) {
      const boxMap = new Map<number, CellCoord>();
      for (let r = 0; r < BOX_SIZE; r++) {
        for (let c = 0; c < BOX_SIZE; c++) {
          const currRow = br + r;
          const currCol = bc + c;
          const val = board[currRow][currCol];
          if (val === 0) continue;
          if (boxMap.has(val)) {
            const peer = boxMap.get(val)!;
            conflicts.push({
              row: currRow,
              col: currCol,
              peerRow: peer.row,
              peerCol: peer.col,
              value: val,
              type: 'box',
            });
          } else {
            boxMap.set(val, { row: currRow, col: currCol });
          }
        }
      }
    }
  }

  return {
    isValid: conflicts.length === 0,
    isComplete: isComplete && conflicts.length === 0,
    conflicts,
  };
}

/**
 * Challenge 2: Find the first empty cell in row-major order.
 * Returns null if no empty cells remain.
 */
export function findFirstEmptyCell(board: Board): CellCoord | null {
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] === 0) {
        return { row: r, col: c };
      }
    }
  }
  return null;
}

/**
 * Find all empty cells.
 */
export function findAllEmptyCells(board: Board): CellCoord[] {
  const empty: CellCoord[] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] === 0) {
        empty.push({ row: r, col: c });
      }
    }
  }
  return empty;
}

/**
 * Challenge 3: Determine valid candidates using Sets.
 * Checks row, column, and 3x3 box.
 */
export function getValidCandidates(board: Board, row: number, col: number): number[] {
  if (board[row][col] !== 0) return [];

  const invalid = new Set<number>();

  // Check row and column
  for (let i = 0; i < BOARD_SIZE; i++) {
    if (board[row][i] !== 0) invalid.add(board[row][i]);
    if (board[i][col] !== 0) invalid.add(board[i][col]);
  }

  // Check 3x3 box
  const origin = getBoxOrigin(row, col);
  for (let r = 0; r < BOX_SIZE; r++) {
    for (let c = 0; c < BOX_SIZE; c++) {
      const val = board[origin.row + r][origin.col + c];
      if (val !== 0) invalid.add(val);
    }
  }

  const valid: number[] = [];
  for (let num = 1; num <= 9; num++) {
    if (!invalid.has(num)) {
      valid.push(num);
    }
  }
  return valid;
}

/**
 * Bitmask implementation for high-performance candidate calculation.
 * Bit i (0-indexed) represents whether digit (i+1) is used.
 */
export interface BoardBitmasks {
  rowMasks: number[];
  colMasks: number[];
  boxMasks: number[];
}

export function computeBoardBitmasks(board: Board): BoardBitmasks {
  const rowMasks = new Array(BOARD_SIZE).fill(0);
  const colMasks = new Array(BOARD_SIZE).fill(0);
  const boxMasks = new Array(BOARD_SIZE).fill(0);

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const val = board[r][c];
      if (val > 0) {
        const bit = 1 << (val - 1);
        rowMasks[r] |= bit;
        colMasks[c] |= bit;
        boxMasks[getBoxIndex(r, c)] |= bit;
      }
    }
  }

  return { rowMasks, colMasks, boxMasks };
}

/**
 * Compute valid candidate bitmask in O(1) bitwise operations.
 * Returns a bitmask where bit (val-1) is 1 if val is a valid candidate.
 */
export function getCandidateBitmask(
  masks: BoardBitmasks,
  row: number,
  col: number
): number {
  const box = getBoxIndex(row, col);
  const used = masks.rowMasks[row] | masks.colMasks[col] | masks.boxMasks[box];
  return (~used) & ALL_BITS_MASK;
}

/**
 * Convert a candidate bitmask to an array of numbers.
 */
export function bitmaskToCandidates(mask: number): number[] {
  const candidates: number[] = [];
  for (let num = 1; num <= 9; num++) {
    if ((mask & (1 << (num - 1))) !== 0) {
      candidates.push(num);
    }
  }
  return candidates;
}

/**
 * Count how many bits are set (popcount) in a candidate bitmask.
 */
export function countCandidatesInBitmask(mask: number): number {
  let count = 0;
  let m = mask;
  while (m > 0) {
    m &= m - 1;
    count++;
  }
  return count;
}

