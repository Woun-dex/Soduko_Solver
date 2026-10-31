# Sudoku Architect: Engine, Visualizer, CSP Optimization & Production Suite

A complete 8-level Sudoku engineering project built with React 18, TypeScript, Tailwind CSS, Web Workers, and Vitest.

---

## 🎯 Architecture & Implemented Levels

### Level 1: Sudoku Engine (Foundation)
- **Data Structures**: 9x9 2D array representation (`0` denotes empty cell, `1-9` clues), Bitmasks (`0x1FF`), Sets, and Maps.
- **Challenge 1 (Validation)**: Validates rows, columns, and 3x3 boxes; detects conflicts and returns exact duplicate coordinate pairs (`src/engine/board.ts`).
- **Challenge 2 (Empty Cell Finder)**: `findFirstEmptyCell` scans the grid in row-major order.
- **Challenge 3 (Candidate Finder)**: Computes valid candidate sets using bitwise operations (`~used & 0x1FF`) and Set-based lookups (`getValidCandidates`).
- **Challenge 4 (Basic Backtracking)**: Recursive DFS solver (`solveBasicBacktracking` in `src/engine/solver-basic.ts`).
- **Challenge 5 (Detect Unsolvable)**: Rejects grids with starting duplicate conflicts, impossible candidate states, and exhausted DFS trees.

### Level 2: Interactive Grid (Frontend)
- **9x9 Controlled Grid**: Thick 3x3 quadrant boundaries, smooth selection highlights.
- **Visual Feedback**:
  - Highlights active cell, current row, column, and 3x3 box.
  - Highlights matching digits across the board.
  - Red conflict indicators when duplicate numbers are placed in row, column, or box.
- **Candidate Notes (Pencil Mode)**:
  - Mini 3x3 sub-grid per cell for pencil marks (1–9).
  - Toggle with the `Notes` button or keyboard key `N`.
  - `Auto Notes` button to populate all valid candidates automatically.
- **History & Undo/Redo**: Full state stack with keyboard shortcuts (`Ctrl+Z`, `Ctrl+Y` / `Cmd+Z`, `Cmd+Shift+Z`).
- **Keyboard Navigation**: Arrow keys to navigate, digits 1–9 to write, Backspace/Delete to erase.

### Level 3: Visualization Engine (Architecture)
- **Generator Event Stream**: `createSolverGenerator` emits discrete state events:
  - `SELECT_CELL`: Choosing the next cell.
  - `TRY_VALUE`: Attempting a candidate number.
  - `BACKTRACK`: Erasing a dead-end attempt and retreating.
  - `SOLVED` / `UNSOLVABLE`: Termination events.
- **Playback Controls**: Play, Pause, Resume, Reset, and Single Step Forward / Backward.
- **Adjustable Speed**: High-speed slider (5ms delay) down to slow step-by-step examination (400ms).
- **Timeline Scrubbing**: Scrub backward and forward through decision history; every step reconstructs the exact board state snapshot.

### Level 4 & 5: Advanced Algorithm Optimization & Constraint Propagation
- **MRV (Minimum Remaining Values)**: Chooses the unassigned cell with the smallest domain, causing immediate pruning when domain size hits 0.
- **Degree Heuristic**: Breaks MRV ties by picking the cell connected to the most unassigned peers.
- **Least Constraining Value (LCV)**: Orders candidate numbers by how few options they eliminate for peer cells.
- **Forward Checking (`solveForwardChecking`)**: Lookahead on 20 peers per assignment; prunes immediately if any peer domain reduces to 0.
- **AC-3 (Arc Consistency Algorithm #3 / MAC)** (`solveAC3` in `src/engine/solvers/ac3.ts`): Maintains arc consistency across peer arcs during DFS search.
- **Donald Knuth's Dancing Links (DLX)** (`solveDLX` in `src/engine/solvers/dlx.ts`): Formulates Sudoku as an Exact Cover matrix with 729 rows and 324 columns, traversed with toroidal circular doubly-linked lists.
- **Bitmask Propagation (`solveBitmaskOptimized`)**: Uses 9-bit bitmask integers for `rowMasks`, `colMasks`, and `boxMasks` for $O(1)$ candidate computations.
- **Live CSP Benchmark Modal**: Compare all 7 solvers side-by-side on any puzzle with step counts, backtracks, and elapsed time.

### Level 6: Concurrency and Performance (Web Workers)
- **Web Worker Architecture** (`src/workers/solver.worker.ts` & `src/workers/worker-client.ts`):
  - Solves difficult puzzles off the main UI thread.
  - Generates event streams asynchronously with typed message passing.
  - **Cancellation**: Clean task abort with `CANCEL` RPC messages.
  - **Memory Management & Batching**: Events streamed in 100-item chunks (`TIMELINE_BATCH`) to prevent memory spikes and ensure smooth 60 FPS animation without UI freezing.

### Level 7: Search-Based Puzzle Generation & Uniqueness Verification
- **Search-Based Generation** (`src/engine/generator.ts`):
  - Fills independent diagonal 3x3 boxes with randomized permutations.
  - Solves terminal grid using DLX.
  - Symmetrically digs holes (180° rotational symmetry).
- **Uniqueness Verification**:
  - Runs `solveDLX(board, 2)` before finalizing cell removal.
  - Guarantees strictly **1 unique solution** for every generated puzzle.
- **Difficulty Grading**: Easy (36–40 clues), Medium (30–34 clues), Hard (25–29 clues), and Evil (21–24 clues).

### Level 8: Production Engineering
- **Accessibility (a11y)**:
  - WAI-ARIA grid patterns: `role="grid"`, `role="row"`, `role="gridcell"`, `aria-selected`, `aria-invalid`, `aria-readonly`.
  - Screen-reader live updates (`role="status"`, `aria-live="polite"`).
- **Error Boundary** (`src/components/ErrorBoundary.tsx`): Catches runtime errors with visual recovery UI and restart buttons.
- **Automated CI/CD**: GitHub Actions workflow (`.github/workflows/ci.yml`) running TypeScript typecheck, Vitest unit & property tests, and production build.

---

## 🚀 Getting Started

### 1. Run Unit Tests (Level 1, 4, 5, 7 Test Suites)
```bash
npm test
```

### 2. Start the Development Server
```bash
npm run dev
```

### 3. Build for Production
```bash
npm run build
```

---

## 📂 Project Structure

```
Soduko_Solver/
├── .github/
│   └── workflows/
│       └── ci.yml                # CI workflow for typecheck, tests, and build
├── src/
│   ├── engine/
│   │   ├── types.ts              # Core types & Worker RPC protocols
│   │   ├── board.ts              # Matrix manipulation, validation, candidates & bitmasks
│   │   ├── solver-basic.ts       # Level 1: Naive DFS backtracking solver
│   │   ├── solver-visualizer.ts  # Level 3: Generator-based visualization engine
│   │   ├── solver-optimized.ts   # Level 4: MRV, Degree, LCV & Bitmask CSP solvers
│   │   ├── solvers/
│   │   │   ├── ac3.ts            # Level 5: Arc Consistency #3 (AC-3) & MAC solver
│   │   │   └── dlx.ts            # Level 5: Donald Knuth Dancing Links Algorithm X
│   │   ├── generator.ts          # Level 7: Search-based generator with uniqueness verification
│   │   ├── benchmark.ts          # Level 4 & 5: Live multi-solver comparative benchmark
│   │   └── puzzles.ts            # Preset bank (Warmup, Challenging, AI Escargot, Unsolvable)
│   ├── workers/
│   │   ├── solver.worker.ts      # Level 6: Dedicated Web Worker for off-thread compute
│   │   └── worker-client.ts      # Level 6: Typed RPC client with batching & cancellation
│   ├── components/
│   │   ├── SudokuGrid.tsx        # Level 2 & 8: 9x9 accessible grid, candidate notes, highlights
│   │   ├── Numpad.tsx            # Digits 1-9, pencil notes toggle, undo/redo, auto notes
│   │   ├── Controls.tsx          # Play, pause, step forward/backward, generator & speed slider
│   │   ├── StatsPanel.tsx        # Telemetry: steps, backtracks, worker thread status & live log
│   │   ├── BenchmarkModal.tsx    # Live comparison table across all 7 algorithms
│   │   └── ErrorBoundary.tsx     # Level 8: React Error Boundary with error recovery UI
│   ├── App.tsx                   # Top-level state, timeline management, keyboard handlers
│   ├── index.css                 # Tailwind typography & dark theme styling
│   └── main.tsx                  # React entry point with ErrorBoundary
└── tests/
    ├── engine.test.ts            # Tests for Level 1 & Level 4 foundation
    └── advanced.test.ts          # Tests for Level 5 (AC-3, DLX), Level 7 (Generator & Uniqueness)
```
