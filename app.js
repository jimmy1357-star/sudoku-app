// Base seed puzzle and corresponding solution
const SEED_PUZZLE = [
  [5, 3, 0, 0, 7, 0, 0, 0, 0],
  [6, 0, 0, 1, 9, 5, 0, 0, 0],
  [0, 9, 8, 0, 0, 0, 0, 6, 0],
  [8, 0, 0, 0, 6, 0, 0, 0, 3],
  [4, 0, 0, 8, 0, 3, 0, 0, 1],
  [7, 0, 0, 0, 2, 0, 0, 0, 6],
  [0, 6, 0, 0, 0, 0, 2, 8, 0],
  [0, 0, 0, 4, 1, 9, 0, 0, 5],
  [0, 0, 0, 0, 8, 0, 0, 7, 9]
];

const SEED_SOLUTION = [
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
let boardState = [];
let givensMask = [];
let selectedIdx = null;

// DOM Elements
const boardEl = document.getElementById('sudoku-board');
const numpadEl = document.getElementById('numpad');
const eraseBtn = document.getElementById('btn-erase');
const newGameBtn = document.getElementById('btn-new-game');

// Initialize Game State
function initGame() {
  // Deep copy seed arrays
  boardState = SEED_PUZZLE.map(row => [...row]);
  givensMask = SEED_PUZZLE.map(row => row.map(val => val !== 0));
  selectedIdx = null;
  renderBoard();
}

// Render Grid Cells
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

      // Style givens vs user numbers
      if (givensMask[r][c]) {
        cell.classList.add('given');
      } else if (val !== 0) {
        cell.classList.add('user-entry');
        if (val !== SEED_SOLUTION[r][c]) {
          cell.classList.add('error');
        }
      }

      // Highlight logic (selected cell + row/col/box crosshair)
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

      // Cell selection handler
      cell.addEventListener('click', () => {
        selectedIdx = idx;
        renderBoard();
      });

      boardEl.appendChild(cell);
    }
  }
}

// Handle User Digit Input
function enterDigit(digit) {
  if (selectedIdx === null) return;
  const r = Math.floor(selectedIdx / 9);
  const c = selectedIdx % 9;

  // Do not allow editing initial given numbers
  if (givensMask[r][c]) return;

  boardState[r][c] = digit;
  renderBoard();
}

// Event Listeners
numpadEl.addEventListener('click', (e) => {
  const btn = e.target.closest('.num-btn');
  if (!btn) return;
  enterDigit(parseInt(btn.dataset.value, 10));
});

eraseBtn.addEventListener('click', () => enterDigit(0));
newGameBtn.addEventListener('click', initGame);

// Keyboard controls for desktop
window.addEventListener('keydown', (e) => {
  if (e.key >= '1' && e.key <= '9') enterDigit(parseInt(e.key, 10));
  if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') enterDigit(0);
});

// Start game on load
initGame();