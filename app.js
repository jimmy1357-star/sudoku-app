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
let moveHistory = [];

let selectedIdx = null;
let currentMode = 'digit'; // 'digit', 'pencil', 'color'
let activeColor = 'c-blue';

// Settings State
let settingsAutoErase = true;
let settingsShowCounts = true;
let settingsHighlightErrors = false;

// Timer State
let timerInterval = null;
let secondsElapsed = 0;
let isPaused = false;
let pausedBySettings = false;

// DOM Elements
const timerEl = document.getElementById('timer');
const pauseBtn = document.getElementById('btn-pause');
const pauseOverlayEl = document.getElementById('pause-overlay');
const resumeBtn = document.getElementById('btn-resume');

const boardEl = document.getElementById('sudoku-board');
const numpadEl = document.getElementById('numpad');
const eraseBtn = document.getElementById('btn-erase');
const undoBtn = document.getElementById('btn-undo');
const newGameBtn = document.getElementById('btn-new-game');
const difficultySelect = document.getElementById('difficulty-select');

const modeDigitBtn = document.getElementById('btn-mode-digit');
const modePencilBtn = document.getElementById('btn-mode-pencil');
const modeColorBtn = document.getElementById('btn-mode-color');
const colorPaletteEl = document.getElementById('color-palette');

// Settings Elements
const settingsBtn = document.getElementById('btn-settings');
const settingsModal = document.getElementById('settings-modal');
const closeSettingsBtn = document.getElementById('btn-close-settings');
const toggleDarkMode = document.getElementById('toggle-dark-mode');
const toggleAutoErase = document.getElementById('toggle-auto-erase');
const toggleDigitCounts = document.getElementById('toggle-digit-counts');
const toggleHighlightErrors = document.getElementById('toggle-highlight-errors');

// --- SETTINGS ENGINE ---
function initSettings() {
  const savedTheme = localStorage.getItem('sudoku-theme');
  const isDark = savedTheme !== 'light';
  document.body.classList.toggle('light-mode', !isDark);
  toggleDarkMode.checked = isDark;

  settingsAutoErase = localStorage.getItem('sudoku-auto-erase') !== 'false';
  toggleAutoErase.checked = settingsAutoErase;

  settingsShowCounts = localStorage.getItem('sudoku-show-counts') !== 'false';
  toggleDigitCounts.checked = settingsShowCounts;

  settingsHighlightErrors = localStorage.getItem('sudoku-highlight-errors') === 'true';
  toggleHighlightErrors.checked = settingsHighlightErrors;
}

toggleDarkMode.addEventListener('change', (e) => {
  const isDark = e.target.checked;
  document.body.classList.toggle('light-mode', !isDark);
  localStorage.setItem('sudoku-theme', isDark ? 'dark' : 'light');
});

toggleAutoErase.addEventListener('change', (e) => {
  settingsAutoErase = e.target.checked;
  localStorage.setItem('sudoku-auto-erase', settingsAutoErase);
});

toggleDigitCounts.addEventListener('change', (e) => {
  settingsShowCounts = e.target.checked;
  localStorage.setItem('sudoku-show-counts', settingsShowCounts);
  updateDigitCounts();
});

toggleHighlightErrors.addEventListener('change', (e) => {
  settingsHighlightErrors = e.target.checked;
  localStorage.setItem('sudoku-highlight-errors', settingsHighlightErrors);
  renderBoard();
});

// Settings Modal Handlers with Auto-Pause
function openSettings() {
  if (!isPaused) {
    isPaused = true;
    pausedBySettings = true;
  }
  settingsModal.classList.remove('hidden');
}

function closeSettings() {
  settingsModal.classList.add('hidden');
  if (pausedBySettings) {
    pausedBySettings = false;
    isPaused = false;
  }
}

settingsBtn.addEventListener('click', openSettings);
closeSettingsBtn.addEventListener('click', closeSettings);
settingsModal.addEventListener('click', (e) => {
  if (e.target === settingsModal) closeSettings();
});

// --- TIMER ENGINE ---
function startTimer() {
  clearInterval(timerInterval);
  secondsElapsed = 0;
  isPaused = false;
  pausedBySettings = false;
  pauseOverlayEl.classList.add('hidden');
  pauseBtn.textContent = '⏸';
  updateTimerDisplay();

  timerInterval = setInterval(() => {
    if (!isPaused) {
      secondsElapsed++;
      updateTimerDisplay();
    }
  }, 1000);
}

function updateTimerDisplay() {
  const mins = Math.floor(secondsElapsed / 60);
  const secs = secondsElapsed % 60;
  const formattedMins = String(mins).padStart(2, '0');
  const formattedSecs = String(secs).padStart(2, '0');
  timerEl.textContent = `${formattedMins}:${formattedSecs}`;
}

function pauseGame() {
  if (isPaused && !pausedBySettings) return;
  isPaused = true;
  pauseOverlayEl.classList.remove('hidden');
  pauseBtn.textContent = '▶';
}

function resumeGame() {
  isPaused = false;
  pausedBySettings = false;
  pauseOverlayEl.classList.add('hidden');
  pauseBtn.textContent = '⏸';
}

function togglePause() {
  if (isPaused) {
    resumeGame();
  } else {
    pauseGame();
  }
}

pauseBtn.addEventListener('click', togglePause);
resumeBtn.addEventListener('click', resumeGame);

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
  moveHistory = [];

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

// --- RULE-BASED CONFLICT VALIDATION ENGINE ---
function hasConflict(r, c) {
  const val = boardState[r][c];
  if (val === 0) return false;

  for (let i = 0; i < 9; i++) {
    if (i !== c && boardState[r][i] === val) return true;
    if (i !== r && boardState[i][c] === val) return true;
  }

  const boxStartRow = Math.floor(r / 3) * 3;
  const boxStartCol = Math.floor(c / 3) * 3;
  for (let br = 0; br < 3; br++) {
    for (let bc = 0; bc < 3; bc++) {
      const row = boxStartRow + br;
      const col = boxStartCol + bc;
      if ((row !== r || col !== c) && boardState[row][col] === val) {
        return true;
      }
    }
  }

  return false;
}

// --- COMPLETION PULSE CHECK ENGINE ---
function checkAndTriggerCompletions(r, c) {
  // Check Row
  let rowSet = new Set();
  let rowValid = true;
  for (let i = 0; i < 9; i++) {
    const v = boardState[r][i];
    if (v === 0 || rowSet.has(v) || hasConflict(r, i)) {
      rowValid = false;
      break;
    }
    rowSet.add(v);
  }

  // Check Column
  let colSet = new Set();
  let colValid = true;
  for (let i = 0; i < 9; i++) {
    const v = boardState[i][c];
    if (v === 0 || colSet.has(v) || hasConflict(i, c)) {
      colValid = false;
      break;
    }
    colSet.add(v);
  }

  // Check 3x3 Box
  let boxSet = new Set();
  let boxValid = true;
  const boxStartRow = Math.floor(r / 3) * 3;
  const boxStartCol = Math.floor(c / 3) * 3;

  for (let br = 0; br < 3; br++) {
    for (let bc = 0; bc < 3; bc++) {
      const row = boxStartRow + br;
      const col = boxStartCol + bc;
      const v = boardState[row][col];
      if (v === 0 || boxSet.has(v) || hasConflict(row, col)) {
        boxValid = false;
        break;
      }
      boxSet.add(v);
    }
  }

  // Trigger outward expanding pulses
  if (rowValid) {
    for (let col = 0; col < 9; col++) {
      const cell = boardEl.children[r * 9 + col];
      if (cell) {
        cell.style.setProperty('--delay-step', Math.abs(col - c));
        cell.classList.add('completed-pulse');
        setTimeout(() => cell.classList.remove('completed-pulse'), 1000);
      }
    }
  }

  if (colValid) {
    for (let row = 0; row < 9; row++) {
      const cell = boardEl.children[row * 9 + c];
      if (cell) {
        cell.style.setProperty('--delay-step', Math.abs(row - r));
        cell.classList.add('completed-pulse');
        setTimeout(() => cell.classList.remove('completed-pulse'), 1000);
      }
    }
  }

  if (boxValid) {
    for (let br = 0; br < 3; br++) {
      for (let bc = 0; bc < 3; bc++) {
        const row = boxStartRow + br;
        const col = boxStartCol + bc;
        const cell = boardEl.children[row * 9 + col];
        if (cell) {
          const dist = Math.max(Math.abs(row - r), Math.abs(col - c));
          cell.style.setProperty('--delay-step', dist);
          cell.classList.add('completed-pulse');
          setTimeout(() => cell.classList.remove('completed-pulse'), 1000);
        }
      }
    }
  }
}

// --- REMAINING DIGIT COUNTER ENGINE ---
function updateDigitCounts() {
  const counts = Array(10).fill(0);
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const val = boardState[r][c];
      if (val >= 1 && val <= 9) {
        counts[val]++;
      }
    }
  }

  document.querySelectorAll('.num-btn[data-value]').forEach(btn => {
    const digit = parseInt(btn.dataset.value, 10);
    if (digit === 0) return;

    const remaining = 9 - counts[digit];
    const countSpan = btn.querySelector('.digit-count');

    if (countSpan) {
      countSpan.textContent = remaining > 0 ? remaining : '';
      countSpan.style.display = settingsShowCounts && remaining > 0 ? 'inline' : 'none';
    }

    btn.classList.toggle('completed', remaining <= 0);
  });
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
          if (settingsHighlightErrors && hasConflict(r, c)) {
            cell.classList.add('error');
          }
        }
      } else if (notesState[r][c].size > 0) {
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
        } else {
          if (selectedVal !== 0 && val === selectedVal) {
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

      cell.addEventListener('click', (e) => {
        e.stopPropagation();
        if (isPaused) return;

        if (selectedIdx === idx && currentMode !== 'color') {
          selectedIdx = null;
        } else {
          selectedIdx = idx;
          if (currentMode === 'color') {
            const newColor = activeColor === 'clear' ? null : activeColor;
            const prevColor = colorsState[r][c];
            if (prevColor !== newColor) {
              moveHistory.push({
                type: 'color',
                r, c,
                prevColor,
                newColor
              });
              colorsState[r][c] = newColor;
            }
          }
        }
        renderBoard();
      });

      boardEl.appendChild(cell);
    }
  }

  updateDigitCounts();
}

// --- USER INPUT HANDLERS ---
function enterDigit(digit) {
  if (selectedIdx === null || isPaused) return;
  const r = Math.floor(selectedIdx / 9);
  const c = selectedIdx % 9;

  if (givensMask[r][c]) return;

  const prevVal = boardState[r][c];
  const prevNotes = new Set(notesState[r][c]);
  const autoErasedNotes = [];

  if (currentMode === 'digit') {
    if (prevVal === digit) return;
    boardState[r][c] = digit;
    notesState[r][c].clear();

    if (settingsAutoErase && digit !== 0) {
      const boxStartRow = Math.floor(r / 3) * 3;
      const boxStartCol = Math.floor(c / 3) * 3;

      for (let i = 0; i < 9; i++) {
        if (notesState[r][i].has(digit)) {
          notesState[r][i].delete(digit);
          autoErasedNotes.push({ r, c: i, digit });
        }
        if (notesState[i][c].has(digit)) {
          notesState[i][c].delete(digit);
          autoErasedNotes.push({ r: i, c, digit });
        }
      }
      for (let br = 0; br < 3; br++) {
        for (let bc = 0; bc < 3; bc++) {
          const row = boxStartRow + br;
          const col = boxStartCol + bc;
          if (notesState[row][col].has(digit)) {
            notesState[row][col].delete(digit);
            autoErasedNotes.push({ r: row, c: col, digit });
          }
        }
      }
    }

  } else if (currentMode === 'pencil' && digit !== 0) {
    boardState[r][c] = 0;
    if (notesState[r][c].has(digit)) {
      notesState[r][c].delete(digit);
    } else {
      notesState[r][c].add(digit);
    }
  } else if (digit === 0) {
    if (prevVal === 0 && prevNotes.size === 0) return;
    boardState[r][c] = 0;
    notesState[r][c].clear();
  }

  moveHistory.push({
    type: 'cell',
    r, c,
    prevVal,
    newVal: boardState[r][c],
    prevNotes,
    newNotes: new Set(notesState[r][c]),
    autoErasedNotes
  });

  renderBoard();

  // Trigger completion outward pulse if row/column/box is filled
  if (digit !== 0 && currentMode === 'digit') {
    checkAndTriggerCompletions(r, c);
  }
}

// --- UNDO ENGINE ---
function undo() {
  if (moveHistory.length === 0 || isPaused) return;

  const lastMove = moveHistory.pop();

  if (lastMove.type === 'cell') {
    const { r, c } = lastMove;
    boardState[r][c] = lastMove.prevVal;
    notesState[r][c] = new Set(lastMove.prevNotes);

    if (lastMove.autoErasedNotes && lastMove.autoErasedNotes.length > 0) {
      lastMove.autoErasedNotes.forEach(item => {
        notesState[item.r][item.c].add(item.digit);
      });
    }
    selectedIdx = r * 9 + c;
  } else if (lastMove.type === 'color') {
    const { r, c } = lastMove;
    colorsState[r][c] = lastMove.prevColor;
    selectedIdx = r * 9 + c;
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
  startTimer();
}

// --- GLOBAL CLICK OUTSIDE LISTENER ---
document.addEventListener('click', (e) => {
  const isCell = e.target.closest('.cell');
  const isButton = e.target.closest('button, select, .color-swatch, .modal-card');
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
undoBtn.addEventListener('click', undo);
newGameBtn.addEventListener('click', initGame);
difficultySelect.addEventListener('change', initGame);

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (!settingsModal.classList.contains('hidden')) {
      closeSettings();
    } else if (isPaused) {
      resumeGame();
    }
    return;
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
    e.preventDefault();
    undo();
    return;
  }
  if (e.key >= '1' && e.key <= '9') enterDigit(parseInt(e.key, 10));
  if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') enterDigit(0);
});

initSettings();
initGame();