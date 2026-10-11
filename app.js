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
let activeStream = 'classic'; 
let selectedVariant = 'classic'; 
let selectedClues = 34; 

let solutionMatrix = [];
let boardState = [];
let givensMask = [];
let notesState = [];
let colorsState = [];
let moveHistory = [];
let thermometers = []; 

let selectedIdx = null;
let currentMode = 'digit'; 
let activeColor = 'c-blue';

// Limits & Counters
let hintsRemaining = 5;
let mistakesCount = 0;
const maxMistakes = 3;
let currentHintResult = null;

// Settings State
let settingsSound = true;
let settingsAutoErase = true;
let settingsShowCounts = true;
let settingsHighlightErrors = false;

// Timer State
let timerInterval = null;
let secondsElapsed = 0;
let isPaused = false;
let pausedBySettings = false;

// DOM Element References
let landingScreenEl, classicSelectScreenEl, challengeSelectScreenEl, challengeDiffScreenEl, gameScreenEl;
let btnModeClassic, btnModeChallenge, btnResumeSaved, resumeDesc;
let btnBackClassic, btnBackChallenge, btnBackChallengeDiff, menuBtn;
let challengeDiffTitle;
let timerEl, pauseBtn, pauseOverlayEl, resumeBtn, btnRulesPause;
let boardEl, svgOverlayEl, numpadEl, eraseBtn, undoBtn;
let modeDigitBtn, modePencilBtn, modeColorBtn, colorPaletteEl;
let btnHint, hintCountEl, hintModal, closeHintBtn, confirmHintBtn, hintMessageEl;
let mistakesBox, mistakesCountEl, gameoverModal, btnGameoverMenu;
let rulesModal, closeRulesBtn, dismissRulesBtn;
let settingsBtnLanding, settingsBtnGame, settingsModal, closeSettingsBtn;
let toggleDarkMode, toggleSound, toggleAutoErase, toggleDigitCounts, toggleHighlightErrors;
let statsBtnLanding, statsModal, closeStatsBtn;

function initDOMReferences() {
  landingScreenEl = document.getElementById('landing-screen');
  classicSelectScreenEl = document.getElementById('classic-select-screen');
  challengeSelectScreenEl = document.getElementById('challenge-select-screen');
  challengeDiffScreenEl = document.getElementById('challenge-diff-screen');
  gameScreenEl = document.getElementById('game-screen');

  btnModeClassic = document.getElementById('btn-mode-classic');
  btnModeChallenge = document.getElementById('btn-mode-challenge');
  btnResumeSaved = document.getElementById('btn-resume-saved');
  resumeDesc = document.getElementById('resume-desc');

  btnBackClassic = document.getElementById('btn-back-classic');
  btnBackChallenge = document.getElementById('btn-back-challenge');
  btnBackChallengeDiff = document.getElementById('btn-back-challenge-diff');
  menuBtn = document.getElementById('btn-menu');

  challengeDiffTitle = document.getElementById('challenge-diff-title');

  timerEl = document.getElementById('timer');
  pauseBtn = document.getElementById('btn-pause');
  pauseOverlayEl = document.getElementById('pause-overlay');
  resumeBtn = document.getElementById('btn-resume');
  btnRulesPause = document.getElementById('btn-rules-pause');

  boardEl = document.getElementById('sudoku-board');
  svgOverlayEl = document.getElementById('svg-overlay');
  numpadEl = document.getElementById('numpad');
  eraseBtn = document.getElementById('btn-erase');
  undoBtn = document.getElementById('btn-undo');

  modeDigitBtn = document.getElementById('btn-mode-digit');
  modePencilBtn = document.getElementById('btn-mode-pencil');
  modeColorBtn = document.getElementById('btn-mode-color');
  colorPaletteEl = document.getElementById('color-palette');

  btnHint = document.getElementById('btn-hint');
  hintCountEl = document.getElementById('hint-count');
  hintModal = document.getElementById('hint-modal');
  closeHintBtn = document.getElementById('btn-close-hint');
  confirmHintBtn = document.getElementById('btn-confirm-hint');
  hintMessageEl = document.getElementById('hint-message');

  mistakesBox = document.getElementById('mistakes-box');
  mistakesCountEl = document.getElementById('mistakes-count');
  gameoverModal = document.getElementById('gameover-modal');
  btnGameoverMenu = document.getElementById('btn-gameover-menu');

  rulesModal = document.getElementById('rules-modal');
  closeRulesBtn = document.getElementById('btn-close-rules');
  dismissRulesBtn = document.getElementById('btn-dismiss-rules');

  settingsBtnLanding = document.getElementById('btn-landing-settings');
  settingsBtnGame = document.getElementById('btn-settings-game');
  settingsModal = document.getElementById('settings-modal');
  closeSettingsBtn = document.getElementById('btn-close-settings');
  toggleDarkMode = document.getElementById('toggle-dark-mode');
  toggleSound = document.getElementById('toggle-sound');
  toggleAutoErase = document.getElementById('toggle-auto-erase');
  toggleDigitCounts = document.getElementById('toggle-digit-counts');
  toggleHighlightErrors = document.getElementById('toggle-highlight-errors');

  statsBtnLanding = document.getElementById('btn-landing-stats');
  statsModal = document.getElementById('stats-modal');
  closeStatsBtn = document.getElementById('btn-close-stats');
}

// --- PERSISTENT SAVE STATE ENGINE ---
function saveGameToStorage() {
  try {
    if (!boardState || boardState.length === 0) return;

    const serializableNotes = notesState.map(row => 
      row.map(cellSet => (cellSet instanceof Set ? Array.from(cellSet) : Array.isArray(cellSet) ? cellSet : []))
    );

    const gameState = {
      boardState,
      givensMask,
      solutionMatrix,
      notesState: serializableNotes,
      colorsState,
      thermometers,
      secondsElapsed,
      hintsRemaining,
      mistakesCount,
      selectedVariant,
      selectedClues
    };
    localStorage.setItem('sudoku-active-game', JSON.stringify(gameState));
  } catch (e) {
    console.error('Failed to save game state:', e);
  }
}

function loadGameFromStorage() {
  const saved = localStorage.getItem('sudoku-active-game');
  if (!saved) return null;
  try {
    return JSON.parse(saved);
  } catch (e) {
    clearSavedGame();
    return null;
  }
}

function clearSavedGame() {
  localStorage.removeItem('sudoku-active-game');
}

function checkActiveSaveStateOnLanding() {
  try {
    const saved = loadGameFromStorage();
    if (saved && saved.boardState && saved.boardState.length === 9 && btnResumeSaved && resumeDesc) {
      btnResumeSaved.classList.remove('hidden');
      const modeName = saved.selectedVariant === 'classic' ? 'Classic' : `Challenge (${saved.selectedVariant})`;
      resumeDesc.textContent = `${modeName} — Time: ${Math.floor((saved.secondsElapsed || 0) / 60)}m ${(saved.secondsElapsed || 0) % 60}s`;
    } else if (btnResumeSaved) {
      btnResumeSaved.classList.add('hidden');
    }
  } catch (e) {
    clearSavedGame();
    if (btnResumeSaved) btnResumeSaved.classList.add('hidden');
  }
}

// --- WEB AUDIO SYNTHESIZER ---
let audioCtx = null;

function playCompletionChime() {
  if (!settingsSound) return;
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const now = audioCtx.currentTime;
    
    [783.99, 987.77, 1174.66].forEach((freq, index) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + index * 0.1);

      gain.gain.setValueAtTime(0, now + index * 0.1);
      gain.gain.linearRampToValueAtTime(0.06, now + index * 0.1 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.1 + 1.2);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start(now + index * 0.1);
      osc.stop(now + index * 0.1 + 1.25);
    });
  } catch (e) {}
}

// --- SETTINGS ENGINE ---
function initSettings() {
  try {
    const savedTheme = localStorage.getItem('sudoku-theme');
    const isDark = savedTheme !== 'light';
    document.body.classList.toggle('light-mode', !isDark);
    if (toggleDarkMode) toggleDarkMode.checked = isDark;

    settingsSound = localStorage.getItem('sudoku-sound') !== 'false';
    if (toggleSound) toggleSound.checked = settingsSound;

    settingsAutoErase = localStorage.getItem('sudoku-auto-erase') !== 'false';
    if (toggleAutoErase) toggleAutoErase.checked = settingsAutoErase;

    settingsShowCounts = localStorage.getItem('sudoku-show-counts') !== 'false';
    if (toggleDigitCounts) toggleDigitCounts.checked = settingsShowCounts;

    settingsHighlightErrors = localStorage.getItem('sudoku-highlight-errors') === 'true';
    if (toggleHighlightErrors) toggleHighlightErrors.checked = settingsHighlightErrors;
    updateMistakesUI();
  } catch (e) {}
}

function attachEventListeners() {
  if (toggleDarkMode) {
    toggleDarkMode.addEventListener('change', (e) => {
      const isDark = e.target.checked;
      document.body.classList.toggle('light-mode', !isDark);
      localStorage.setItem('sudoku-theme', isDark ? 'dark' : 'light');
    });
  }

  if (toggleSound) {
    toggleSound.addEventListener('change', (e) => {
      settingsSound = e.target.checked;
      localStorage.setItem('sudoku-sound', settingsSound);
    });
  }

  if (toggleAutoErase) {
    toggleAutoErase.addEventListener('change', (e) => {
      settingsAutoErase = e.target.checked;
      localStorage.setItem('sudoku-auto-erase', settingsAutoErase);
    });
  }

  if (toggleDigitCounts) {
    toggleDigitCounts.addEventListener('change', (e) => {
      settingsShowCounts = e.target.checked;
      localStorage.setItem('sudoku-show-counts', settingsShowCounts);
      updateDigitCounts();
    });
  }

  if (toggleHighlightErrors) {
    toggleHighlightErrors.addEventListener('change', (e) => {
      settingsHighlightErrors = e.target.checked;
      localStorage.setItem('sudoku-highlight-errors', settingsHighlightErrors);
      updateMistakesUI();
      renderBoard();
    });
  }

  if (settingsBtnLanding) settingsBtnLanding.addEventListener('click', openSettings);
  if (settingsBtnGame) settingsBtnGame.addEventListener('click', openSettings);
  if (closeSettingsBtn) closeSettingsBtn.addEventListener('click', closeSettings);
  if (settingsModal) {
    settingsModal.addEventListener('click', (e) => {
      if (e.target === settingsModal) closeSettings();
    });
  }

  if (statsBtnLanding) statsBtnLanding.addEventListener('click', () => statsModal.classList.remove('hidden'));
  if (closeStatsBtn) closeStatsBtn.addEventListener('click', () => statsModal.classList.add('hidden'));
  if (statsModal) {
    statsModal.addEventListener('click', (e) => {
      if (e.target === statsModal) statsModal.classList.add('hidden');
    });
  }

  if (closeRulesBtn) closeRulesBtn.addEventListener('click', closeRules);
  if (dismissRulesBtn) dismissRulesBtn.addEventListener('click', closeRules);
  if (btnRulesPause) btnRulesPause.addEventListener('click', openRules);

  if (btnHint) btnHint.addEventListener('click', openHintModal);
  if (closeHintBtn) closeHintBtn.addEventListener('click', closeHintModal);
  if (confirmHintBtn) confirmHintBtn.addEventListener('click', triggerHint);
  if (hintModal) {
    hintModal.addEventListener('click', (e) => {
      if (e.target === hintModal) closeHintModal();
    });
  }

  if (btnGameoverMenu) {
    btnGameoverMenu.addEventListener('click', () => {
      clearSavedGame();
      gameoverModal.classList.add('hidden');
      showLandingScreen();
    });
  }

  if (pauseBtn) pauseBtn.addEventListener('click', togglePause);
  if (resumeBtn) resumeBtn.addEventListener('click', resumeGame);

  if (btnModeClassic) {
    btnModeClassic.addEventListener('click', () => {
      if (loadGameFromStorage()) {
        if (!confirm("Starting a new game will forfeit your current active game. Continue?")) return;
      }
      clearSavedGame();
      activeStream = 'classic';
      selectedVariant = 'classic';
      hideAllScreens();
      if (classicSelectScreenEl) classicSelectScreenEl.classList.remove('hidden');
    });
  }

  if (btnModeChallenge) {
    btnModeChallenge.addEventListener('click', () => {
      if (loadGameFromStorage()) {
        if (!confirm("Starting a new game will forfeit your current active game. Continue?")) return;
      }
      clearSavedGame();
      activeStream = 'challenge';
      hideAllScreens();
      if (challengeSelectScreenEl) challengeSelectScreenEl.classList.remove('hidden');
    });
  }

  if (btnResumeSaved) {
    btnResumeSaved.addEventListener('click', () => {
      const saved = loadGameFromStorage();
      if (saved) {
        resumeSavedGame(saved);
      }
    });
  }

  if (btnBackClassic) btnBackClassic.addEventListener('click', showLandingScreen);
  if (btnBackChallenge) btnBackChallenge.addEventListener('click', showLandingScreen);
  if (btnBackChallengeDiff) {
    btnBackChallengeDiff.addEventListener('click', () => {
      hideAllScreens();
      if (challengeSelectScreenEl) challengeSelectScreenEl.classList.remove('hidden');
    });
  }
  if (menuBtn) menuBtn.addEventListener('click', showLandingScreen);

  document.querySelectorAll('.diff-option-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedClues = parseInt(btn.dataset.difficulty, 10);
      startNewGame();
    });
  });

  document.querySelectorAll('.variant-option-card:not(.disabled)').forEach(card => {
    card.addEventListener('click', () => {
      selectedVariant = card.dataset.variant;
      const variantNames = { thermometer: 'Thermometer', knight: 'Knight Move', irregular: 'Irregular Jigsaw' };
      if (challengeDiffTitle) challengeDiffTitle.textContent = variantNames[selectedVariant] || 'Challenge';
      hideAllScreens();
      if (challengeDiffScreenEl) challengeDiffScreenEl.classList.remove('hidden');
    });
  });

  document.querySelectorAll('.challenge-diff-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedClues = parseInt(btn.dataset.difficulty, 10);
      startNewGame();
    });
  });

  if (modeDigitBtn) modeDigitBtn.addEventListener('click', () => setMode('digit'));
  if (modePencilBtn) modePencilBtn.addEventListener('click', () => setMode('pencil'));
  if (modeColorBtn) modeColorBtn.addEventListener('click', () => setMode('color'));

  if (colorPaletteEl) {
    colorPaletteEl.addEventListener('click', (e) => {
      const swatch = e.target.closest('.color-swatch');
      if (!swatch) return;
      document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
      swatch.classList.add('active');
      activeColor = swatch.dataset.color;
    });
  }

  if (numpadEl) {
    numpadEl.addEventListener('click', (e) => {
      const btn = e.target.closest('.num-btn');
      if (!btn) return;
      enterDigit(parseInt(btn.dataset.value, 10));
    });
  }

  if (eraseBtn) eraseBtn.addEventListener('click', () => enterDigit(0));
  if (undoBtn) undoBtn.addEventListener('click', undo);

  document.addEventListener('click', (e) => {
    const isCell = e.target.closest('.cell');
    const isButton = e.target.closest('button, select, .color-swatch, .modal-card');
    if (!isCell && !isButton && selectedIdx !== null) {
      selectedIdx = null;
      renderBoard();
    }
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (settingsModal && !settingsModal.classList.contains('hidden')) closeSettings();
      else if (statsModal && !statsModal.classList.contains('hidden')) statsModal.classList.add('hidden');
      else if (rulesModal && !rulesModal.classList.contains('hidden')) closeRules();
      else if (hintModal && !hintModal.classList.contains('hidden')) closeHintModal();
      else if (isPaused) resumeGame();
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

  // Mobile App Lifecycle Persistence Listeners
  window.addEventListener('pagehide', () => saveGameToStorage());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      saveGameToStorage();
    }
  });
}

function updateMistakesUI() {
  if (mistakesBox && mistakesCountEl) {
    mistakesBox.classList.toggle('hidden', !settingsHighlightErrors);
    mistakesCountEl.textContent = mistakesCount;
  }
}

function openSettings() {
  if (!isPaused && gameScreenEl.classList.contains('hidden')) {
    pausedBySettings = false;
  } else if (!isPaused) {
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

function openRules() { rulesModal.classList.remove('hidden'); }
function closeRules() { rulesModal.classList.add('hidden'); }

// --- SMART LOGICAL HINT ENGINE (MINI SUDOKU AI) ---
function getCellCandidates(r, c) {
  const candidates = [];
  const used = new Set();

  for (let i = 0; i < 9; i++) {
    if (boardState[r][i] !== 0) used.add(boardState[r][i]);
    if (boardState[i][c] !== 0) used.add(boardState[i][c]);
  }

  const boxStartR = Math.floor(r / 3) * 3;
  const boxStartC = Math.floor(c / 3) * 3;
  for (let br = 0; br < 3; br++) {
    for (let bc = 0; bc < 3; bc++) {
      const val = boardState[boxStartR + br][boxStartC + bc];
      if (val !== 0) used.add(val);
    }
  }

  if (selectedVariant === 'thermometer') {
    for (const thermo of thermometers) {
      for (let i = 0; i < thermo.length; i++) {
        if (thermo[i].r === r && thermo[i].c === c) {
          if (i > 0) {
            const prevVal = boardState[thermo[i - 1].r][thermo[i - 1].c];
            if (prevVal !== 0) {
              for (let d = 1; d <= prevVal; d++) used.add(d);
            }
          }
          if (i < thermo.length - 1) {
            const nextVal = boardState[thermo[i + 1].r][thermo[i + 1].c];
            if (nextVal !== 0) {
              for (let d = nextVal; d <= 9; d++) used.add(d);
            }
          }
        }
      }
    }
  }

  for (let d = 1; d <= 9; d++) {
    if (!used.has(d)) candidates.push(d);
  }
  return candidates;
}

function findSmartHint() {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (boardState[r][c] !== 0 && !givensMask[r][c] && hasConflict(r, c)) {
        return {
          r, c, digit: boardState[r][c],
          type: 'Conflict',
          message: `<strong>Rule Conflict:</strong> The entry at Row ${r + 1}, Column ${c + 1} violates a Sudoku or variant constraint. Review this cell.`
        };
      }
    }
  }

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (boardState[r][c] === 0 && !givensMask[r][c]) {
        const candidates = getCellCandidates(r, c);
        if (candidates.length === 1) {
          const digit = candidates[0];
          return {
            r, c, digit,
            type: 'Naked Single',
            message: `<strong>Naked Single:</strong> Look at Row ${r + 1}, Column ${c + 1}. Its intersecting row, column, and 3x3 box eliminate all other possibilities. This cell <strong>must be ${digit}</strong>.`
          };
        }
      }
    }
  }

  for (let r = 0; r < 9; r++) {
    for (let d = 1; d <= 9; d++) {
      let alreadyPlaced = false;
      for (let c = 0; c < 9; c++) {
        if (boardState[r][c] === d) { alreadyPlaced = true; break; }
      }
      if (alreadyPlaced) continue;

      let validCells = [];
      for (let c = 0; c < 9; c++) {
        if (boardState[r][c] === 0 && getCellCandidates(r, c).includes(d)) {
          validCells.push({ r, c });
        }
      }
      if (validCells.length === 1) {
        const target = validCells[0];
        return {
          r: target.r, c: target.c, digit: d,
          type: 'Hidden Single (Row)',
          message: `<strong>Hidden Single:</strong> In Row ${r + 1}, the digit <strong>${d}</strong> can only legally fit into Column ${target.c + 1}. All other open cells in this row are blocked.`
        };
      }
    }
  }

  for (let c = 0; c < 9; c++) {
    for (let d = 1; d <= 9; d++) {
      let alreadyPlaced = false;
      for (let r = 0; r < 9; r++) {
        if (boardState[r][c] === d) { alreadyPlaced = true; break; }
      }
      if (alreadyPlaced) continue;

      let validCells = [];
      for (let r = 0; r < 9; r++) {
        if (boardState[r][c] === 0 && getCellCandidates(r, c).includes(d)) {
          validCells.push({ r, c });
        }
      }
      if (validCells.length === 1) {
        const target = validCells[0];
        return {
          r: target.r, c: target.c, digit: d,
          type: 'Hidden Single (Col)',
          message: `<strong>Hidden Single:</strong> In Column ${c + 1}, the digit <strong>${d}</strong> has only one valid position remaining at Row ${target.r + 1}.`
        };
      }
    }
  }

  for (let br = 0; br < 3; br++) {
    for (let bc = 0; bc < 3; bc++) {
      const boxStartR = br * 3;
      const boxStartC = bc * 3;
      for (let d = 1; d <= 9; d++) {
        let alreadyPlaced = false;
        for (let dr = 0; dr < 3; dr++) {
          for (let dc = 0; dc < 3; dc++) {
            if (boardState[boxStartR + dr][boxStartC + dc] === d) { alreadyPlaced = true; break; }
          }
          if (alreadyPlaced) break;
        }
        if (alreadyPlaced) continue;

        let validCells = [];
        for (let dr = 0; dr < 3; dr++) {
          for (let dc = 0; dc < 3; dc++) {
            const r = boxStartR + dr;
            const c = boxStartC + dc;
            if (boardState[r][c] === 0 && getCellCandidates(r, c).includes(d)) {
              validCells.push({ r, c });
            }
          }
        }
        if (validCells.length === 1) {
          const target = validCells[0];
          const boxNum = br * 3 + bc + 1;
          return {
            r: target.r, c: target.c, digit: d,
            type: 'Hidden Single (Box)',
            message: `<strong>Hidden Single:</strong> In 3x3 Box ${boxNum}, the digit <strong>${d}</strong> can only fit at Row ${target.r + 1}, Column ${target.c + 1}.`
          };
        }
      }
    }
  }

  if (selectedVariant === 'thermometer' && thermometers.length > 0) {
    for (const thermo of thermometers) {
      const bulb = thermo[0];
      const maxBulbVal = 10 - thermo.length;
      if (boardState[bulb.r][bulb.c] === 0) {
        return {
          r: bulb.r, c: bulb.c, digit: null,
          type: 'Thermometer Bulb',
          message: `<strong>Thermometer Constraint:</strong> Look at the thermometer bulb at Row ${bulb.r + 1}, Column ${bulb.c + 1}. Because this thermometer path spans ${thermo.length} cells, the bulb value cannot exceed <strong>${maxBulbVal}</strong>.`
        };
      }
    }
  }

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (boardState[r][c] === 0 && !givensMask[r][c]) {
        return {
          r, c, digit: solutionMatrix[r][c],
          type: 'Strategic Focus',
          message: `<strong>Strategic Focus:</strong> Examine Row ${r + 1}, Column ${c + 1}. Review intersecting row, column, and box candidates to narrow down your next move.`
        };
      }
    }
  }

  return null;
}

function openHintModal() {
  if (hintsRemaining <= 0) {
    hintMessageEl.innerHTML = "You have no hints remaining for this game!";
    confirmHintBtn.style.display = 'none';
  } else {
    // Step 1: Just show confirmation prompt. Do NOT calculate or deduct yet!
    hintMessageEl.innerHTML = `Would you like a hint? You have [${hintsRemaining}] remaining.`;
    confirmHintBtn.style.display = 'block';
    confirmHintBtn.textContent = "Get Direction";
  }
  hintModal.classList.remove('hidden');
}

function closeHintModal() {
  hintModal.classList.add('hidden');
}

function triggerHint() {
  if (hintsRemaining <= 0) return;

  // Step 2: User confirmed. Now deduct hint, calculate smart hint, and display message.
  hintsRemaining--;
  if (hintCountEl) hintCountEl.textContent = hintsRemaining;
  
  currentHintResult = findSmartHint();
  if (currentHintResult) {
    hintMessageEl.innerHTML = `${currentHintResult.message}<br><br><span style="color: var(--text-muted); font-size: 0.85rem;">[${hintsRemaining} hints remaining]</span>`;
  } else {
    hintMessageEl.innerHTML = `No immediate logical deduction found, but keep scanning!<br><br><span style="color: var(--text-muted); font-size: 0.85rem;">[${hintsRemaining} hints remaining]</span>`;
  }

  confirmHintBtn.style.display = 'none'; // Hide button after revealing so closing just dismisses
  saveGameToStorage();

  if (currentHintResult) {
    selectedIdx = currentHintResult.r * 9 + currentHintResult.c;
    renderBoard();
  }
}

function startTimer() {
  clearInterval(timerInterval);
  isPaused = false;
  pausedBySettings = false;
  if (pauseOverlayEl) pauseOverlayEl.classList.add('hidden');
  if (pauseBtn) pauseBtn.textContent = '⏸';
  updateTimerDisplay();

  timerInterval = setInterval(() => {
    if (!isPaused) {
      secondsElapsed++;
      updateTimerDisplay();
      saveGameToStorage();
    }
  }, 1000);
}

function updateTimerDisplay() {
  if (timerEl) {
    const mins = Math.floor(secondsElapsed / 60);
    const secs = secondsElapsed % 60;
    timerEl.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
}

function pauseGame() {
  if (isPaused && !pausedBySettings) return;
  isPaused = true;
  if (pauseOverlayEl) pauseOverlayEl.classList.remove('hidden');
  if (pauseBtn) pauseBtn.textContent = '▶';
}

function resumeGame() {
  isPaused = false;
  pausedBySettings = false;
  if (pauseOverlayEl) pauseOverlayEl.classList.add('hidden');
  if (pauseBtn) pauseBtn.textContent = '⏸';
}

function togglePause() {
  if (isPaused) resumeGame(); else pauseGame();
}

function hideAllScreens() {
  if (landingScreenEl) landingScreenEl.classList.add('hidden');
  if (classicSelectScreenEl) classicSelectScreenEl.classList.add('hidden');
  if (challengeSelectScreenEl) challengeSelectScreenEl.classList.add('hidden');
  if (challengeDiffScreenEl) challengeDiffScreenEl.classList.add('hidden');
  if (gameScreenEl) gameScreenEl.classList.add('hidden');
}

function showLandingScreen() {
  clearInterval(timerInterval);
  saveGameToStorage();
  hideAllScreens();
  checkActiveSaveStateOnLanding();
  if (landingScreenEl) landingScreenEl.classList.remove('hidden');
}

function startNewGame() {
  clearSavedGame();
  hintsRemaining = 5;
  if (hintCountEl) hintCountEl.textContent = hintsRemaining;
  mistakesCount = 0;
  secondsElapsed = 0;
  updateMistakesUI();

  hideAllScreens();
  if (gameScreenEl) gameScreenEl.classList.remove('hidden');
  
  generateNewPuzzle();
  renderBoard();
  startTimer();
  saveGameToStorage();

  if (selectedVariant !== 'classic') {
    openRules();
  }
}

function resumeSavedGame(saved) {
  boardState = saved.boardState && saved.boardState.length === 9 ? saved.boardState : Array.from({ length: 9 }, () => Array(9).fill(0));
  givensMask = saved.givensMask && saved.givensMask.length === 9 ? saved.givensMask : Array.from({ length: 9 }, () => Array(9).fill(false));
  solutionMatrix = saved.solutionMatrix && saved.solutionMatrix.length === 9 ? saved.solutionMatrix : BASE_SOLUTION;
  
  if (saved.notesState && saved.notesState.length === 9) {
    notesState = saved.notesState.map(row => 
      row.map(cellArr => new Set(Array.isArray(cellArr) ? cellArr : []))
    );
  } else {
    notesState = Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => new Set()));
  }
    
  colorsState = saved.colorsState && saved.colorsState.length === 9 ? saved.colorsState : Array.from({ length: 9 }, () => Array(9).fill(null));
  thermometers = saved.thermometers || [];
  secondsElapsed = saved.secondsElapsed || 0;
  hintsRemaining = saved.hintsRemaining ?? 5;
  mistakesCount = saved.mistakesCount || 0;
  selectedVariant = saved.selectedVariant || 'classic';
  selectedClues = saved.selectedClues || 34;

  if (hintCountEl) hintCountEl.textContent = hintsRemaining;
  updateMistakesUI();

  hideAllScreens();
  if (gameScreenEl) gameScreenEl.classList.remove('hidden');

  requestAnimationFrame(() => {
    renderThermometersSVG();
    renderBoard();
    startTimer();
  });
}

function generateThermometersForSolution() {
  thermometers = [];
  const occupiedCells = new Set();
  const targetCount = selectedClues === 0 ? 5 : 4; 

  const directions = [
    { dr: -1, dc: 0 }, { dr: 1, dc: 0 }, { dr: 0, dc: -1 }, { dr: 0, dc: 1 },
    { dr: -1, dc: -1 }, { dr: -1, dc: 1 }, { dr: 1, dc: -1 }, { dr: 1, dc: 1 }
  ];

  for (let attempt = 0; attempt < 120 && thermometers.length < targetCount; attempt++) {
    const startR = Math.floor(Math.random() * 9);
    const startC = Math.floor(Math.random() * 9);
    const key = `${startR},${startC}`;

    if (occupiedCells.has(key)) continue;

    const path = [{ r: startR, c: startC }];
    let currR = startR;
    let currC = startC;
    let currVal = solutionMatrix[currR][currC];

    const isLong = Math.random() < 0.35;
    const targetLength = isLong ? (Math.floor(Math.random() * 2) + 7) : (Math.floor(Math.random() * 3) + 3);

    for (let step = 0; step < targetLength - 1; step++) {
      const validNeighbors = [];
      directions.forEach(d => {
        const nr = currR + d.dr;
        const nc = currC + d.dc;
        if (nr >= 0 && nr < 9 && nc >= 0 && nc < 9) {
          if (!path.some(p => p.r === nr && p.c === nc)) {
            const nextVal = solutionMatrix[nr][nc];
            if (nextVal > currVal) {
              validNeighbors.push({ r: nr, c: nc, val: nextVal });
            }
          }
        }
      });

      if (validNeighbors.length === 0) break;

      validNeighbors.sort((a, b) => a.val - b.val);
      const chosen = validNeighbors[0];

      path.push({ r: chosen.r, c: chosen.c });
      currR = chosen.r;
      currC = chosen.c;
      currVal = chosen.val;
    }

    if (path.length >= 3) {
      let tooClose = false;
      for (const existingPath of thermometers) {
        for (const p1 of path) {
          for (const p2 of existingPath) {
            const dist = Math.max(Math.abs(p1.r - p2.r), Math.abs(p1.c - p2.c));
            if (dist === 1 && !path.some(x => x.r === p2.r && x.c === p2.c)) {
              tooClose = true;
            }
          }
        }
      }

      if (!tooClose) {
        thermometers.push(path);
        path.forEach(p => occupiedCells.add(`${p.r},${p.c}`));
      }
    }
  }
}

// --- THIN THERMOMETER RENDERER WITH DISTINCT BULB ---
function renderThermometersSVG() {
  if (!svgOverlayEl) return;
  svgOverlayEl.innerHTML = '';
  if (selectedVariant !== 'thermometer' || thermometers.length === 0) return;

  const cellSize = 100 / 9;

  thermometers.forEach(path => {
    if (path.length === 0) return;

    let pathData = '';
    path.forEach((pt, idx) => {
      const x = pt.c * cellSize + cellSize / 2;
      const y = pt.r * cellSize + cellSize / 2;
      if (idx === 0) pathData += `M ${x} ${y}`;
      else pathData += ` L ${x} ${y}`;
    });

    const stemPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    stemPath.setAttribute('d', pathData);
    stemPath.setAttribute('stroke', 'var(--thermo-stem)');
    stemPath.setAttribute('stroke-width', '2.4');
    stemPath.setAttribute('fill', 'none');
    stemPath.setAttribute('stroke-linecap', 'round');
    stemPath.setAttribute('stroke-linejoin', 'round');
    svgOverlayEl.appendChild(stemPath);

    const bulbPt = path[0];
    const bulbX = bulbPt.c * cellSize + cellSize / 2;
    const bulbY = bulbPt.r * cellSize + cellSize / 2;

    const bulbCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    bulbCircle.setAttribute('cx', bulbX);
    bulbCircle.setAttribute('cy', bulbY);
    bulbCircle.setAttribute('r', '4.2');
    bulbCircle.setAttribute('fill', 'var(--thermo-stem)');
    svgOverlayEl.appendChild(bulbCircle);
  });
}

function generateNewPuzzle() {
  const cluesCount = selectedClues;
  
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

  if (selectedVariant === 'thermometer') {
    generateThermometersForSolution();
  } else {
    thermometers = [];
  }

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

  renderThermometersSVG();
}

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

  if (selectedVariant === 'thermometer') {
    for (const path of thermometers) {
      for (let i = 0; i < path.length - 1; i++) {
        const currCell = path[i];
        const nextCell = path[i + 1];
        const v1 = boardState[currCell.r][currCell.c];
        const v2 = boardState[nextCell.r][nextCell.c];

        if (v1 !== 0 && v2 !== 0 && v1 >= v2) {
          if ((currCell.r === r && currCell.c === c) || (nextCell.r === r && nextCell.c === c)) {
            return true;
          }
        }
      }
    }
  }

  return false;
}

function checkAndTriggerCompletions(r, c) {
  if (!boardEl) return;
  let rowSet = new Set(), rowValid = true;
  for (let i = 0; i < 9; i++) {
    const v = boardState[r][i];
    if (v === 0 || rowSet.has(v) || hasConflict(r, i)) { rowValid = false; break; }
    rowSet.add(v);
  }

  let colSet = new Set(), colValid = true;
  for (let i = 0; i < 9; i++) {
    const v = boardState[i][c];
    if (v === 0 || colSet.has(v) || hasConflict(i, c)) { colValid = false; break; }
    colSet.add(v);
  }

  let boxSet = new Set(), boxValid = true;
  const boxStartRow = Math.floor(r / 3) * 3, boxStartCol = Math.floor(c / 3) * 3;
  for (let br = 0; br < 3; br++) {
    for (let bc = 0; bc < 3; bc++) {
      const row = boxStartRow + br, col = boxStartCol + bc;
      const v = boardState[row][col];
      if (v === 0 || boxSet.has(v) || hasConflict(row, col)) { boxValid = false; break; }
      boxSet.add(v);
    }
  }

  let triggered = false;
  if (rowValid) {
    triggered = true;
    for (let col = 0; col < 9; col++) {
      const cell = boardEl.children[r * 9 + col];
      if (cell) {
        cell.style.setProperty('--delay-step', Math.abs(col - c));
        cell.classList.add('completed-pulse');
        setTimeout(() => cell.classList.remove('completed-pulse'), 1400);
      }
    }
  }
  if (colValid) {
    triggered = true;
    for (let row = 0; row < 9; row++) {
      const cell = boardEl.children[row * 9 + c];
      if (cell) {
        cell.style.setProperty('--delay-step', Math.abs(row - r));
        cell.classList.add('completed-pulse');
        setTimeout(() => cell.classList.remove('completed-pulse'), 1400);
      }
    }
  }
  if (boxValid) {
    triggered = true;
    for (let br = 0; br < 3; br++) {
      for (let bc = 0; bc < 3; bc++) {
        const row = boxStartRow + br, col = boxStartCol + bc;
        const cell = boardEl.children[row * 9 + col];
        if (cell) {
          const dist = Math.max(Math.abs(row - r), Math.abs(col - c));
          cell.style.setProperty('--delay-step', dist);
          cell.classList.add('completed-pulse');
          setTimeout(() => cell.classList.remove('completed-pulse'), 1400);
        }
      }
    }
  }
  if (triggered) playCompletionChime();
}

function updateDigitCounts() {
  const counts = Array(10).fill(0);
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const val = boardState[r][c];
      if (val >= 1 && val <= 9) counts[val]++;
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

function renderBoard() {
  if (!boardEl) return;
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

      if (colorsState[r][c]) cell.classList.add(colorsState[r][c]);

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
      } else if (notesState[r] && notesState[r][c] && notesState[r][c].size > 0) {
        const pencilGrid = document.createElement('div');
        pencilGrid.className = 'pencil-grid';
        for (let d = 1; d <= 9; d++) {
          const pencilCell = document.createElement('div');
          pencilCell.className = 'pencil-digit';
          if (notesState[r][c].has(d)) pencilCell.textContent = d;
          pencilGrid.appendChild(pencilCell);
        }
        cell.appendChild(pencilGrid);
      }

      if (selectedIdx !== null) {
        if (idx === selectedIdx) cell.classList.add('selected');
        else {
          if (selectedVal !== 0 && val === selectedVal) cell.classList.add('same-number');
          else if (
            r === selRow || c === selCol ||
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
              moveHistory.push({ type: 'color', r, c, prevColor, newColor });
              colorsState[r][c] = newColor;
            }
          }
        }
        renderBoard();
        saveGameToStorage();
      });

      boardEl.appendChild(cell);
    }
  }

  updateDigitCounts();
}

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

    if (settingsHighlightErrors && digit !== 0) {
      if (hasConflict(r, c) || digit !== solutionMatrix[r][c]) {
        mistakesCount++;
        updateMistakesUI();
        if (mistakesCount >= maxMistakes) {
          clearSavedGame();
          pauseGame();
          if (gameoverModal) gameoverModal.classList.remove('hidden');
        }
      }
    }

    if (settingsAutoErase && digit !== 0) {
      const boxStartRow = Math.floor(r / 3) * 3;
      const boxStartCol = Math.floor(c / 3) * 3;
      for (let i = 0; i < 9; i++) {
        if (notesState[r][i].has(digit)) { notesState[r][i].delete(digit); autoErasedNotes.push({ r, c: i, digit }); }
        if (notesState[i][c].has(digit)) { notesState[i][c].delete(digit); autoErasedNotes.push({ r: i, c, digit }); }
      }
      for (let br = 0; br < 3; br++) {
        for (let bc = 0; bc < 3; bc++) {
          const row = boxStartRow + br, col = boxStartCol + bc;
          if (notesState[row][col].has(digit)) { notesState[row][col].delete(digit); autoErasedNotes.push({ r: row, c: col, digit }); }
        }
      }
    }
  } else if (currentMode === 'pencil' && digit !== 0) {
    boardState[r][c] = 0;
    if (notesState[r][c].has(digit)) notesState[r][c].delete(digit);
    else notesState[r][c].add(digit);
  } else if (digit === 0) {
    if (prevVal === 0 && prevNotes.size === 0) return;
    boardState[r][c] = 0;
    notesState[r][c].clear();
  }

  moveHistory.push({
    type: 'cell', r, c, prevVal, newVal: boardState[r][c], prevNotes, newNotes: new Set(notesState[r][c]), autoErasedNotes
  });

  renderBoard();
  saveGameToStorage();
  if (digit !== 0 && currentMode === 'digit') checkAndTriggerCompletions(r, c);
}

function undo() {
  if (moveHistory.length === 0 || isPaused) return;
  const lastMove = moveHistory.pop();

  if (lastMove.type === 'cell') {
    const { r, c } = lastMove;
    boardState[r][c] = lastMove.prevVal;
    notesState[r][c] = new Set(lastMove.prevNotes);
    if (lastMove.autoErasedNotes) {
      lastMove.autoErasedNotes.forEach(item => notesState[item.r][item.c].add(item.digit));
    }
    selectedIdx = r * 9 + c;
  } else if (lastMove.type === 'color') {
    const { r, c } = lastMove;
    colorsState[r][c] = lastMove.prevColor;
    selectedIdx = r * 9 + c;
  }
  renderBoard();
  saveGameToStorage();
}

function setMode(mode) {
  currentMode = mode;
  if (modeDigitBtn) modeDigitBtn.classList.toggle('active', mode === 'digit');
  if (modePencilBtn) modePencilBtn.classList.toggle('active', mode === 'pencil');
  if (modeColorBtn) modeColorBtn.classList.toggle('active', mode === 'color');
  if (colorPaletteEl) colorPaletteEl.classList.toggle('hidden', mode !== 'color');
}

// --- DOMContentLoaded Initialization Guard ---
document.addEventListener('DOMContentLoaded', () => {
  initDOMReferences();
  initSettings();
  attachEventListeners();
  checkActiveSaveStateOnLanding();
  showLandingScreen();
});