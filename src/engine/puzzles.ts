export interface PuzzleDef {
  id: string;
  name: string;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Expert' | 'Extreme' | 'Unsolvable';
  clues: number;
  boardString: string;
  description: string;
}

export const PUZZLE_PRESETS: PuzzleDef[] = [
  {
    id: 'easy-1',
    name: 'Gentle Warmup',
    difficulty: 'Easy',
    clues: 38,
    boardString:
      '2...8.3...6..7..84.3.5..2.9...1.54.8.........4.27.6...3.1..7.4.72..4..6...4.1...3',
    description: 'Generous initial clues, ideal for testing basic deduction.',
  },
  {
    id: 'medium-1',
    name: 'Standard Daily',
    difficulty: 'Medium',
    clues: 30,
    boardString:
      '..3.2.6..9..3.5..1..18.64....81.29..7.......8..67.82....26.95..8..2.3..9..5.1.3..',
    description: 'Requires moderate candidate elimination and cross-checking.',
  },
  {
    id: 'hard-1',
    name: 'Challenging Grid',
    difficulty: 'Hard',
    clues: 25,
    boardString:
      '4.....8.5.3..........7......2.....6.....8.4......1.......6.3.7.5..2.....1.4......',
    description: 'Sparse clues requiring deeper search or MRV heuristics.',
  },
  {
    id: 'expert-inkala',
    name: 'Arto Inkala’s AI Escargot',
    difficulty: 'Extreme',
    clues: 23,
    boardString:
      '85...24..72......9..4.........1.7..23.5...9...4...........8..7..17..........36.4.',
    description: 'Created by mathematician Arto Inkala. Infamous for causing naive solvers to explore thousands of branches.',
  },
  {
    id: 'platinum-blond',
    name: 'Platinum Blonde',
    difficulty: 'Extreme',
    clues: 21,
    boardString:
      '.......12........3..23..4....18....54.......7.3........4.5..2..5.......6...6..',
    description: 'Near minimum clue threshold (21 clues) requiring high-order CSP constraint propagation.',
  },
  {
    id: 'unsolvable-1',
    name: 'Unsolvable (Row Conflict)',
    difficulty: 'Unsolvable',
    clues: 24,
    boardString:
      '55.....12........3..23..4....18....54.......7.3........4.5..2..5.......6...6..78.',
    description: 'Contains immediate duplicate 5s in the first row. Should be rejected instantly by validator.',
  },
  {
    id: 'unsolvable-deadend',
    name: 'Unsolvable (Hidden Contradiction)',
    difficulty: 'Unsolvable',
    clues: 28,
    boardString:
      '516849732328167549974235816159374268687952134243618957795421386432586971861793425',
    description: 'Almost filled, but leads to an inescapable domain wipeout for remaining empty cells.',
  },
];

