import { Board, GeneratedPuzzle, PuzzleDifficulty } from './types';
import { createEmptyBoard, cloneBoard, BOARD_SIZE, BOX_SIZE } from './board';
import { solveDLX } from './solvers/dlx';

/**
 * Level 7: Search-Based Puzzle Generation with Guaranteed Unique Solution
 */

function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Fills the 3 independent diagonal 3x3 boxes with random permutations of 1..9
 */
function fillDiagonalBoxes(board: Board): void {
  for (let b = 0; b < BOARD_SIZE; b += BOX_SIZE) {
    const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    let idx = 0;
    for (let r = 0; r < BOX_SIZE; r++) {
      for (let c = 0; c < BOX_SIZE; c++) {
        board[b + r][b + c] = nums[idx++];
      }
    }
  }
}

/**
 * Generates a completely filled valid Sudoku board using DLX
 */
export function generateSolvedBoard(): Board {
  const board = createEmptyBoard();
  fillDiagonalBoxes(board);
  const result = solveDLX(board, 1);
  if (!result.solved || !result.solution) {
    // In the rare event diagonal fill creates a conflict, retry
    return generateSolvedBoard();
  }
  return result.solution;
}

/**
 * Target clue counts for difficulty levels
 */
const DIFFICULTY_CONFIG: Record<PuzzleDifficulty, { minClues: number; maxClues: number }> = {
  Easy: { minClues: 36, maxClues: 40 },
  Medium: { minClues: 30, maxClues: 34 },
  Hard: { minClues: 25, maxClues: 29 },
  Evil: { minClues: 21, maxClues: 24 },
};

/**
 * Digs holes symmetrically while guaranteeing exactly 1 unique solution
 */
export function generatePuzzle(
  difficulty: PuzzleDifficulty = 'Medium',
  symmetry: 'rotational180' | 'random' = 'rotational180'
): GeneratedPuzzle {
  const solvedBoard = generateSolvedBoard();
  const puzzleBoard = cloneBoard(solvedBoard);
  const { minClues, maxClues } = DIFFICULTY_CONFIG[difficulty];
  const targetClues = Math.floor(Math.random() * (maxClues - minClues + 1)) + minClues;

  // Generate list of all cell positions
  const cells: [number, number][] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      cells.push([r, c]);
    }
  }
  const shuffledCells = shuffle(cells);

  let currentClues = 81;

  for (const [r, c] of shuffledCells) {
    if (currentClues <= targetClues) break;
    if (puzzleBoard[r][c] === 0) continue;

    const r2 = symmetry === 'rotational180' ? 8 - r : r;
    const c2 = symmetry === 'rotational180' ? 8 - c : c;

    const prevVal1 = puzzleBoard[r][c];
    const prevVal2 = puzzleBoard[r2][c2];

    // Tentatively remove
    puzzleBoard[r][c] = 0;
    puzzleBoard[r2][c2] = 0;

    // Check solution count with DLX (cap search at 2)
    const check = solveDLX(puzzleBoard, 2);

    if (check.solutionsCount === 1) {
      // Still strictly unique! Keep removal
      currentClues -= r === r2 && c === c2 ? 1 : 2;
    } else {
      // Destroyed uniqueness (0 or 2+ solutions). Put numbers back!
      puzzleBoard[r][c] = prevVal1;
      puzzleBoard[r2][c2] = prevVal2;
    }
  }

  // Final sanity check
  const finalCheck = solveDLX(puzzleBoard, 2);
  if (finalCheck.solutionsCount !== 1) {
    // If somehow lost uniqueness, regenerate
    return generatePuzzle(difficulty, symmetry);
  }

  const techniques = [
    'Naked Singles',
    difficulty !== 'Easy' ? 'Hidden Singles' : '',
    difficulty === 'Hard' || difficulty === 'Evil' ? 'Constraint Propagation' : '',
    difficulty === 'Evil' ? 'Arc Consistency & Search' : '',
  ].filter(Boolean);

  return {
    board: puzzleBoard,
    solution: solvedBoard,
    difficulty,
    cluesCount: currentClues,
    techniquesUsed: techniques,
    symmetry,
  };
}

