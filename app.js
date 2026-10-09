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

// State Variables
let solutionMatrix = [];
let boardState = [];
let givensMask = [];
let notesState = [];
let colorsState = [];

let selectedIdx = null;
let currentMode = 'digit'; // 'digit', 'pencil', 'color'
let activeColor = 'c-blue';

// DOM Elements
const boardEl = document.getElementById('sudoku-board');
const numpadEl = document.getElementById('numpad');
const eraseBtn = document.getElementById('btn-erase');
const newGameBtn = document.getElementById('btn-new-game');
const difficultySelect = document.getElementById('difficulty-select');

const modeDigitBtn = document.getElementById('btn-mode-digit');
const modePencilBtn = document.getElementById('btn-mode-pencil');
const modeColorBtn = document.getElementById('btn-mode-color');
const colorPaletteEl = document.getElementById('color-palette');

// --- PERMUTATION ENGINE ---
function generateNewPuzzle() {
  const cluesCount = parseInt(difficultySelect.value, 10);
  
  const digitMap = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5);
  let permuted = BASE_SOLUTION.map(row => row.map(val => digitMap[val - 1]));

  for (let band = 0; band < 3; band++) {
    let rows = [0, 1, 2].sort(() => Math.random() - 0.5);
    let bandRows = rows.map(r => permuted[band * 3 + r]);
    for (let r = 0; r < 3; r++) permuted[band * 3 + r] = bandRows[r];
  }

  if (Math.random() > 0.5) {
    permuted = permuted[0].map((_, colIdx) => permuted.map(row => row[colIdx]));
  }

  solutionMatrix = permuted;

  givensMask = Array.from({ length: 9 }, () => Array(9).fill(false));
  boardState = Array.from({ length: 9 }, () => Array(9).fill(0));
  notesState = Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => new Set()));
  colorsState = Array.from({ length: 9 }, () => Array(9).fill(null));

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
  const selectedVal = selectedIdx !== null ? boardState[selRow][selCol] : 0;

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const idx = r * 9 + c;
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.row = r;
      cell.dataset.col = c;

      // Apply Custom Marking Color
      if (colorsState[r][c]) {
        cell.classList.add(colorsState[r][c]);
      }

      const val = boardState[r][c];

      if (val !== 0) {
        cell.textContent = val;
        if (givensMask[r][c]) {
          cell.classList.add('given');
        } else {
          cell.classList.add('user-entry');
          if (val !== solutionMatrix[r][c]) {
            cell.classList.add('error');
          }
        }
      } else if (notesState[r][c].size > 0) {
        // Render 3x3 Pencil Notes Grid
        const pencilGrid = document.createElement('div');
        pencilGrid.className = 'pencil-grid';
        for (let d = 1; d <= 9; d++) {
          const pencilCell = document.createElement('div');
          pencilCell.className = 'pencil-digit';
          if (notesState[r][c].has(d)) {
            pencilCell.textContent = d;
          }
          pencilGrid.appendChild(pencilCell);
        }
        cell.appendChild(pencilGrid);
      }

      // Highlights logic
      if (selectedIdx !== null) {
        if (idx === selectedIdx) {
          cell.classList.add('selected');
        } else if (selectedVal !== 0) {
          // Crosshairs & matching digits ONLY highlight when a cell WITH a number is selected
          if (val === selectedVal) {
            cell.classList.add('same-number');
          } else if (
            r === selRow ||
            c === selCol ||
            (Math.floor(r / 3) === Math.floor(selRow / 3) && Math.floor(c / 3) === Math.floor(selCol / 3))
          ) {
            cell.classList.add('highlighted');
          }
        }
      }

      // Cell click handler
      cell.addEventListener('click', (e) => {
        e.stopPropagation();
        if (selectedIdx === idx) {
          // Re-clicking selected cell deselects it
          selectedIdx = null;
        } else {
          selectedIdx = idx;
          if (currentMode === 'color') {
            colorsState[r][c] = activeColor === 'clear' ? null : activeColor;
          }
        }
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

  if (currentMode === 'digit') {
    boardState[r][c] = digit;
    notesState[r][c].clear();
  } else if (currentMode === 'pencil' && digit !== 0) {
    boardState[r][c] = 0;
    if (notesState[r][c].has(digit)) {
      notesState[r][c].delete(digit);
    } else {
      notesState[r][c].add(digit);
    }
  } else if (digit === 0) {
    boardState[r][c] = 0;
    notesState[r][c].clear();
  }

  renderBoard();
}

function setMode(mode) {
  currentMode = mode;
  modeDigitBtn.classList.toggle('active', mode === 'digit');
  modePencilBtn.classList.toggle('active', mode === 'pencil');
  modeColorBtn.classList.toggle('active', mode === 'color');
  colorPaletteEl.classList.toggle('hidden', mode !== 'color');
}

function initGame() {
  selectedIdx = null;
  generateNewPuzzle();
  renderBoard();
}

// --- GLOBAL CLICK OUTSIDE LISTENER ---
document.addEventListener('click', (e) => {
  const isCell = e.target.closest('.cell');
  const isButton = e.target.closest('button, select, .color-swatch');
  if (!isCell && !isButton) {
    if (selectedIdx !== null) {
      selectedIdx = null;
      renderBoard();
    }
  }
});

// --- EVENT LISTENERS ---
modeDigitBtn.addEventListener('click', () => setMode('digit'));
modePencilBtn.addEventListener('click', () => setMode('pencil'));
modeColorBtn.addEventListener('click', () => setMode('color'));

colorPaletteEl.addEventListener('click', (e) => {
  const swatch = e.target.closest('.color-swatch');
  if (!swatch) return;
  document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
  swatch.classList.add('active');
  activeColor = swatch.dataset.color;
});

numpadEl.addEventListener('click', (e) => {
  const btn = e.target.closest('.num-btn');
  if (!btn) return;
  enterDigit(parseInt(btn.dataset.value, 10));
});

eraseBtn.addEventListener('click', () => enterDigit(0));
newGameBtn.addEventListener('click', initGame);
difficultySelect.addEventListener('change', initGame);

window.addEventListener('keydown', (e) => {
  if (e.key >= '1' && e.key <= '9') enterDigit(parseInt(e.key, 10));
  if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') enterDigit(0);
});

initGame();