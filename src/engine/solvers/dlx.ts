import { Board, SolveResult, SolverStats } from '../types';
import { cloneBoard, validateBoard, BOARD_SIZE, BOX_SIZE } from '../board';

/**
 * Donald Knuth's Dancing Links Algorithm X (DLX)
 * Exact Cover formulation for Sudoku
 */

class DLXNode {
  left: DLXNode = this;
  right: DLXNode = this;
  up: DLXNode = this;
  down: DLXNode = this;
  column!: ColumnNode;
  rowId: number = -1;
}

class ColumnNode extends DLXNode {
  size: number = 0;
  name: string = '';
  constructor(name: string) {
    super();
    this.name = name;
    this.column = this;
  }
}

export class DLX {
  header: ColumnNode;
  columns: ColumnNode[] = [];
  solution: number[] = [];
  solutionsFound: number[][] = [];
  steps: number = 0;
  backtracks: number = 0;

  constructor(numCols: number) {
    this.header = new ColumnNode('header');
    let prev: ColumnNode = this.header;

    for (let i = 0; i < numCols; i++) {
      const col = new ColumnNode(`C${i}`);
      col.left = prev;
      col.right = this.header;
      prev.right = col;
      this.header.left = col;
      this.columns.push(col);
      prev = col;
    }
  }

  addRow(rowId: number, colIndices: number[]): void {
    let firstNode: DLXNode | null = null;

    for (const cIdx of colIndices) {
      const col = this.columns[cIdx];
      const newNode = new DLXNode();
      newNode.rowId = rowId;
      newNode.column = col;

      // Link up/down into column list
      newNode.up = col.up;
      newNode.down = col;
      col.up.down = newNode;
      col.up = newNode;
      col.size++;

      // Link left/right in row list
      if (!firstNode) {
        firstNode = newNode;
        newNode.left = newNode;
        newNode.right = newNode;
      } else {
        newNode.left = firstNode.left;
        newNode.right = firstNode;
        firstNode.left.right = newNode;
        firstNode.left = newNode;
      }
    }
  }

  cover(col: ColumnNode): void {
    col.right.left = col.left;
    col.left.right = col.right;

    for (let row = col.down; row !== col; row = row.down) {
      for (let rightNode = row.right; rightNode !== row; rightNode = rightNode.right) {
        rightNode.down.up = rightNode.up;
        rightNode.up.down = rightNode.down;
        rightNode.column.size--;
      }
    }
  }

  uncover(col: ColumnNode): void {
    for (let row = col.up; row !== col; row = row.up) {
      for (let leftNode = row.left; leftNode !== row; leftNode = leftNode.left) {
        leftNode.column.size++;
        leftNode.down.up = leftNode;
        leftNode.up.down = leftNode;
      }
    }

    col.right.left = col;
    col.left.right = col;
  }

  search(maxSolutions: number = 1): void {
    this.steps++;

    if (this.header.right === this.header) {
      this.solutionsFound.push([...this.solution]);
      return;
    }

    // Heuristic: choose column with minimum size (MRV principle in DLX)
    let bestCol: ColumnNode = this.header.right as ColumnNode;
    let minSize = bestCol.size;

    for (let c = this.header.right as ColumnNode; c !== this.header; c = c.right as ColumnNode) {
      if (c.size < minSize) {
        minSize = c.size;
        bestCol = c;
        if (minSize === 0) break;
      }
    }

    if (minSize === 0) {
      this.backtracks++;
      return; // Dead end
    }

    this.cover(bestCol);

    for (let row = bestCol.down; row !== bestCol; row = row.down) {
      this.solution.push(row.rowId);

      for (let rightNode = row.right; rightNode !== row; rightNode = rightNode.right) {
        this.cover(rightNode.column);
      }

      this.search(maxSolutions);

      if (this.solutionsFound.length >= maxSolutions) {
        return;
      }

      this.solution.pop();
      this.backtracks++;

      for (let leftNode = row.left; leftNode !== row; leftNode = leftNode.left) {
        this.uncover(leftNode.column);
      }
    }

    this.uncover(bestCol);
  }
}

/**
 * Builds and solves Sudoku using DLX Exact Cover
 */
export function solveDLX(
  initialBoard: Board,
  maxSolutions: number = 1
): SolveResult & { solutionsCount: number; allSolutions: Board[] } {
  const startTime = performance.now();
  const board = cloneBoard(initialBoard);

  if (!validateBoard(board).isValid) {
    return {
      solved: false,
      solution: null,
      solutionsCount: 0,
      allSolutions: [],
      stats: { steps: 0, backtracks: 0, nodesVisited: 0, timeMs: performance.now() - startTime, solved: false },
    };
  }

  // 324 columns = 81 (cell) + 81 (row-num) + 81 (col-num) + 81 (box-num)
  const dlx = new DLX(324);

  // Encode candidate rows
  // rowId = r * 81 + c * 9 + (num - 1)
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const fixedVal = board[r][c];
      const box = Math.floor(r / BOX_SIZE) * BOX_SIZE + Math.floor(c / BOX_SIZE);

      for (let num = 1; num <= 9; num++) {
        if (fixedVal !== 0 && fixedVal !== num) continue;

        const rowId = r * 81 + c * 9 + (num - 1);
        const colIndices = [
          r * 9 + c,                          // Constraint 1: Cell (r, c)
          81 + r * 9 + (num - 1),             // Constraint 2: Row r has num
          162 + c * 9 + (num - 1),            // Constraint 3: Col c has num
          243 + box * 9 + (num - 1),          // Constraint 4: Box has num
        ];

        dlx.addRow(rowId, colIndices);
      }
    }
  }

  dlx.search(maxSolutions);

  const stats: SolverStats = {
    steps: dlx.steps,
    backtracks: dlx.backtracks,
    nodesVisited: dlx.steps,
    timeMs: performance.now() - startTime,
    solved: dlx.solutionsFound.length > 0,
    solutionsCount: dlx.solutionsFound.length,
  };

  const allSolutions: Board[] = dlx.solutionsFound.map(solRowIds => {
    const solvedBoard = cloneBoard(board);
    for (const rowId of solRowIds) {
      const r = Math.floor(rowId / 81);
      const rem = rowId % 81;
      const c = Math.floor(rem / 9);
      const num = (rem % 9) + 1;
      solvedBoard[r][c] = num;
    }
    return solvedBoard;
  });

  return {
    solved: allSolutions.length > 0,
    solution: allSolutions.length > 0 ? allSolutions[0] : null,
    solutionsCount: allSolutions.length,
    allSolutions,
    stats,
  };
}

