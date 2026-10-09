// Master base seed solution matrix
const BASE_SOLUTION = [
  [5, 3, 4, 6, 7, 8, 9, 1, 2],
  [6, 7, 2, 1, 9, 5, 3, 4, 8],
  [1, 9, 8, 3, 4, 2, 5, 6, 7],
  [8, 5, 9, 7, 6, 1, 4, 2, 3],
  [4, 2, 6, 8, 5, 3, 7, 9, 1],
  [7, 1, 3, 9, 2, 4, 8, 5, 6],
  [9, 6, 1, 5, 3, 7, 2, 8, 4],
  [2, 8, 7, 4, 1, 9, 6, 3, 5],
  [3, 4, 5, 2, 8, 6, 1, 7, 9]
];

// Game State
let solutionMatrix = [];
let boardState = [];
let givensMask = [];
let selectedIdx = null;

// DOM Elements
const boardEl = document.getElementById('sudoku-board');
const numpadEl = document.getElementById('numpad');
const eraseBtn = document.getElementById('btn-erase');
const newGameBtn = document.getElementById('btn-new-game');

// --- PERMUTATION ENGINE ---
function generateNewPuzzle(cluesCount = 36) {
  // 1. Random digit mapping ([1..9] -> shuffled [1..9])
  const digitMap = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5);
  let permuted = BASE_SOLUTION.map(row => row.map(val => digitMap[val - 1]));

  // 2. Shuffle rows within each 3x3 band
  for (let band = 0; band < 3; band++) {
    let rows = [0, 1, 2].sort(() => Math.random() - 0.5);
    let bandRows = rows.map(r => permuted[band * 3 + r]);
    for (let r = 0; r < 3; r++) permuted[band * 3 + r] = bandRows[r];
  }

  // 3. 50% chance to transpose matrix (swap rows and columns)
  if (Math.random() > 0.5) {
    permuted = permuted[0].map((_, colIdx) => permuted.map(row => row[colIdx]));
  }

  solutionMatrix = permuted;

  // 4. Generate givens mask based on desired clues count
  givensMask = Array.from({ length: 9 }, () => Array(9).fill(false));
  boardState = Array.from({ length: 9 }, () => Array(9).fill(0));

  let placedClues = 0;
  while (placedClues < cluesCount) {
    let r = Math.floor(Math.random() * 9);
    let c = Math.floor(Math.random() * 9);
    if (!givensMask[r][c]) {
      givensMask[r][c] = true;
      boardState[r][c] = solutionMatrix[r][c];
      placedClues++;
    }
  }
}

// --- RENDER ENGINE ---
function renderBoard() {
  boardEl.innerHTML = '';
  
  const selRow = selectedIdx !== null ? Math.floor(selectedIdx / 9) : null;
  const selCol = selectedIdx !== null ? selectedIdx % 9 : null;

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const idx = r * 9 + c;
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.row = r;
      cell.dataset.col = c;

      const val = boardState[r][c];
      if (val !== 0) cell.textContent = val;

      if (givensMask[r][c]) {
        cell.classList.add('given');
      } else if (val !== 0) {
        cell.classList.add('user-entry');
        if (val !== solutionMatrix[r][c]) {
          cell.classList.add('error');
        }
      }

      if (selectedIdx !== null) {
        if (idx === selectedIdx) {
          cell.classList.add('selected');
        } else if (
          r === selRow ||
          c === selCol ||
          (Math.floor(r / 3) === Math.floor(selRow / 3) && Math.floor(c / 3) === Math.floor(selCol / 3))
        ) {
          cell.classList.add('highlighted');
        }
      }

      cell.addEventListener('click', () => {
        selectedIdx = idx;
        renderBoard();
      });

      boardEl.appendChild(cell);
    }
  }
}

// --- USER INPUT HANDLERS ---
function enterDigit(digit) {
  if (selectedIdx === null) return;
  const r = Math.floor(selectedIdx / 9);
  const c = selectedIdx % 9;

  if (givensMask[r][c]) return;

  boardState[r][c] = digit;
  renderBoard();
}

function initGame() {
  selectedIdx = null;
  generateNewPuzzle(36); // 36 givens = Medium difficulty
  renderBoard();
}

// --- EVENT LISTENERS ---
numpadEl.addEventListener('click', (e) => {
  const btn = e.target.closest('.num-btn');
  if (!btn) return;
  enterDigit(parseInt(btn.dataset.value, 10));
});

eraseBtn.addEventListener('click', () => enterDigit(0));
newGameBtn.addEventListener('click', initGame);

window.addEventListener('keydown', (e) => {
  if (e.key >= '1' && e.key <= '9') enterDigit(parseInt(e.key, 10));
  if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') enterDigit(0);
});

// Start initial game
initGame();