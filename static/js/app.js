// static/js/app.js

import { fetchThemes, fetchConfig, fetchHintAPI, submitGuessAPI, giveUpAPI } from './api.js';
import { 
  getTileElement, applyTheme, renderThemeModal, openThemeModal, closeThemeModal, 
  openRulesModal, closeRulesModal, openModal, closeModal, updateLangToggleUI, 
  updateUITexts, buildGrid, buildKeyboard, disableActionButtons, 
  updateKeyStatus, showMessage, clearMessage, buildSubjectBox, 
} from './ui.js';

let currentLang = localStorage.getItem("termo_lang") || "en";
let currentThemeId = localStorage.getItem("termo_theme") || "classic";
let availableThemes = [];

let wordLength = 5;
let targetCount = 1;
let targets = [];
let maxAttempts = 6;
let currentAttempt = 0;

let currentGuess = [];
let cursorIndex = 0;
let gameOver = false;
let gameEndState = null;

let isAnimating = false;

let givenTiles = [];
let correctIndices = new Set();
let boardStates = [];

function isGivenTile(boardIdx, colIdx) {
  if (targets[boardIdx] && targets[boardIdx][colIdx]) {
    return givenTiles.includes(targets[boardIdx][colIdx]);
  }
  return false;
}

function isSkippableColumn(colIdx) {
  if (!boardStates || boardStates.length === 0) return false;

  const activeBoards = boardStates
    .map((state, index) => ({ state, index }))
    .filter((b) => !b.state.solved);

  if (activeBoards.length === 0) return true;

  return activeBoards.every((b) => isGivenTile(b.index, colIdx));
}

function getFirstValidIndex() {
  for (let i = 0; i < wordLength; i++) {
    if (!isSkippableColumn(i)) return i;
  }
  return 0;
}

function getNextValidIndex(fromIndex, direction) {
  let idx = fromIndex + direction;
  while (idx >= 0 && idx < wordLength) {
    if (!isSkippableColumn(idx)) return idx;
    idx += direction;
  }
  return fromIndex;
}

function createEmptyGuessArray() {
  return Array(wordLength).fill("");
}

function handleThemeSelection(theme) {
  currentThemeId = applyTheme(theme);
  renderThemeModal(availableThemes, currentThemeId, currentLang, handleThemeSelection);
}

async function initGame() {
  clearMessage();

  try {
    availableThemes = await fetchThemes();
    const activeTheme = availableThemes.find((t) => t.id === currentThemeId) || availableThemes[0];
    if (activeTheme) {
      currentThemeId = applyTheme(activeTheme);
    }
    renderThemeModal(availableThemes, currentThemeId, currentLang, handleThemeSelection);
  } catch (e) {
    console.error("Failed to fetch themes from /api/themes", e);
  }

  try {
    const config = await fetchConfig();

    document.title = config.title;
    document.getElementById("game-title").innerText = config.title;

    wordLength = config.length;
    targets = config.targets || config.target || [];
    if (typeof targets === "string") targets = [targets];

    targetCount = config.target_count ?? targets.length ?? 1;
    maxAttempts = config.max_attempts;

    givenTiles = config.given_tiles || [];
    correctIndices = new Set();

    document.documentElement.style.setProperty("--word-length", wordLength);

    updateLangToggleUI(currentLang);
    refreshUI();

    buildSubjectBox(config.subject_text, config.subject_image_url, currentLang);

    boardStates = Array.from({ length: targetCount }, (_, b) => {
      const targetWord = targets[b] || "";
      const isSolved = targetWord.length > 0 && targetWord.split("").every((char) => givenTiles.includes(char));
      return { solved: isSolved, solvedAtAttempt: isSolved ? 0 : null };
    });

    currentGuess = createEmptyGuessArray();
    cursorIndex = getFirstValidIndex();

    buildGrid(targetCount, maxAttempts, wordLength, handleTileClick);
    buildKeyboard(processInput);

    givenTiles.forEach((char) => {
      const inAnyTarget = targets.some((t) => t.includes(char));
      if (!inAnyTarget) {
        updateKeyStatus(char, "absent");
      }
    });

    updateCurrentRow();

    document.addEventListener("keydown", handlePhysicalKeyboard);

    isAnimating = true;
    await revealGivenTilesForRow(0);
    isAnimating = false;

    updateCurrentRow();

    if (boardStates.every((b) => b.solved)) {
      gameOver = true;
      gameEndState = {
        type: "win",
        messageIndex: Math.floor(Math.random() * TRANSLATIONS[currentLang].winMessages.length),
      };
      grayOutRemainingTiles();
      refreshUI();
      disableActionButtons();

      setTimeout(() => openModal(), wordLength * 150 + 600);
    }
  } catch (e) {
    console.error("Failed to initialize game config", e);
  }
}

function handleTileClick(r, c) {
  if (!gameOver && r === currentAttempt && !isSkippableColumn(c)) {
    cursorIndex = c;
    updateCurrentRow();
  }
}

function refreshUI() {
    updateUITexts(currentLang, targetCount, gameEndState, openModal);
}

function changeLanguage(lang) {
  currentLang = lang;
  localStorage.setItem("termo_lang", lang);
  updateLangToggleUI(currentLang);
  refreshUI();
  renderThemeModal(availableThemes, currentThemeId, currentLang, handleThemeSelection);
}

function revealGivenTilesForRow(rowIdx) {
  return new Promise((resolve) => {
    let hasGivenTiles = false;
    let maxDelay = 0;

    for (let b = 0; b < targetCount; b++) {
      if (boardStates[b] && boardStates[b].solved) continue;

      for (let c = 0; c < wordLength; c++) {
        if (isGivenTile(b, c)) {
          hasGivenTiles = true;
          const tile = getTileElement(b, rowIdx, c);
          if (!tile) continue;

          tile.dataset.revealing = "true";

          const char = targets[b][c];
          const delay = c * 150;
          if (delay > maxDelay) maxDelay = delay;

          setTimeout(() => {
            tile.classList.add("flip");

            setTimeout(() => {
              tile.innerText = char;
              tile.classList.add("correct", "given-tile");

              updateKeyStatus(char, "correct");

              delete tile.dataset.revealing;
              tile.dataset.flipped = "true";
            }, 250);
          }, delay);
        }
      }
    }

    if (hasGivenTiles) {
      setTimeout(() => resolve(), maxDelay + 500);
    } else {
      resolve();
    }
  });
}

function handlePhysicalKeyboard(e) {
  if (e.key === " " || e.code === "Space") {
    e.preventDefault();
  }

  if (gameOver || isAnimating) return;

  if (e.key === "Enter") {
    processInput("ENTER");
  } else if (e.key === "Backspace" || e.key === "Delete") {
    processInput("DEL");
  } else if (e.key === "ArrowLeft") {
    cursorIndex = getNextValidIndex(cursorIndex, -1);
    updateCurrentRow();
  } else if (e.key === "ArrowRight") {
    cursorIndex = getNextValidIndex(cursorIndex, 1);
    updateCurrentRow();
  } else {
    const normalizedKey = e.key
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase();

    if (/^[A-Z\-& ]$/.test(normalizedKey)) {
      processInput(normalizedKey);
    }
  }
}

function processInput(key) {
  if (gameOver || isAnimating) return;

  if (key === "ENTER") {
    submitGuess();
  } else if (key === "DEL") {
    if (currentGuess[cursorIndex] !== "") {
      currentGuess[cursorIndex] = "";
    } else {
      const prevIndex = getNextValidIndex(cursorIndex, -1);
      if (prevIndex !== cursorIndex) {
        cursorIndex = prevIndex;
        currentGuess[cursorIndex] = "";
      }
    }
    updateCurrentRow();
  } else if (/^[A-Z\-& ]$/.test(key)) {
    currentGuess[cursorIndex] = key;
    const nextIndex = getNextValidIndex(cursorIndex, 1);
    if (nextIndex > cursorIndex) {
      cursorIndex = nextIndex;
    }
    updateCurrentRow();
  }
}

function updateCurrentRow() {
  for (let b = 0; b < targetCount; b++) {
    if (boardStates[b] && boardStates[b].solved) continue;

    for (let c = 0; c < wordLength; c++) {
      const tile = getTileElement(b, currentAttempt, c);
      if (!tile) continue;

      if (tile.dataset.revealing === "true") continue;

      const typedLetter = currentGuess[c] || "";
      const isGiven = isGivenTile(b, c);
      const displayChar = isGiven ? targets[b][c] : typedLetter;

      const hadFlip = tile.classList.contains("flip");
      tile.className = "tile";
      if (hadFlip) tile.classList.add("flip");

      if (isGiven) {
        if (tile.dataset.flipped === "true") {
          tile.innerText = displayChar;
          tile.classList.add("correct", "given-tile");
        } else {
          tile.innerText = "";
        }
      } else {
        tile.innerText = displayChar;

        if (displayChar !== "") {
          tile.classList.add("filled");
        }

        if (c === cursorIndex && !gameOver) {
          tile.classList.add("active-cursor");
        }
      }
    }
  }
}

async function useHint() {
  if (gameOver || isAnimating) return;

  clearMessage();
  isAnimating = true;

  const activeBoardIdx = boardStates.findIndex((b) => !b.solved);
  const bIdx = activeBoardIdx === -1 ? 0 : activeBoardIdx;

  const knownCorrect = new Set(correctIndices);
  for (let r = 0; r < currentAttempt; r++) {
    for (let c = 0; c < wordLength; c++) {
      const tile = getTileElement(bIdx, r, c);
      if (tile && tile.classList.contains("correct")) {
        knownCorrect.add(c);
      }
    }
  }

  currentGuess = createEmptyGuessArray();
  updateCurrentRow();

  try {
    const data = await fetchHintAPI(Array.from(knownCorrect), bIdx);

    if (data.error) {
      isAnimating = false;
      showMessage(TRANSLATIONS[currentLang].noHints);
      return;
    }

    correctIndices.add(data.hint_index);
    await animateAndProcessResult(data);
  } catch (err) {
    isAnimating = false;
    console.error(err);
  }
}

async function submitGuess() {
  if (gameOver || isAnimating) return;

  clearMessage();

  let fullGuessArray = [];
  for (let i = 0; i < wordLength; i++) {
    if (isSkippableColumn(i)) {
      const activeBoard = boardStates.find((b) => !b.solved) || boardStates[0];
      const boardIdx = boardStates.indexOf(activeBoard);
      fullGuessArray[i] = targets[boardIdx][i];
    } else {
      fullGuessArray[i] = currentGuess[i];
    }
  }

  if (fullGuessArray.some((char) => char === undefined || char === null || char === "")) {
    showMessage(TRANSLATIONS[currentLang].mustFill(wordLength));
    return;
  }

  isAnimating = true;
  const wordToSubmit = fullGuessArray.join("");

  try {
    const data = await submitGuessAPI(wordToSubmit);

    if (data.error) {
      isAnimating = false;
      showMessage(data.error);
      return;
    }

    await animateAndProcessResult(data);
  } catch (err) {
    isAnimating = false;
    console.error(err);
  }
}

function animateAndProcessResult(data) {
  return new Promise((resolve) => {
    isAnimating = true;
    const rowToAnimate = currentAttempt;

    for (let b = 0; b < targetCount; b++) {
      const activeCursorTile = getTileElement(b, rowToAnimate, cursorIndex);
      if (activeCursorTile) activeCursorTile.classList.remove("active-cursor");
    }

    const FLIP_DURATION = 500;
    const STAGGER_DELAY = 250;
    const evaluations = data.evaluations || [data];

    for (let b = 0; b < targetCount; b++) {
      if (boardStates[b] && boardStates[b].solved) continue;
      const evalData = evaluations[b] || evaluations[0];

      for (let i = 0; i < wordLength; i++) {
        const backendChar = (evalData.guess && evalData.guess[i]) || (data.guess && data.guess[i]);
        const letter = currentGuess[i] || backendChar || "";

        if (!isGivenTile(b, i)) {
          if (evalData.pattern[i] === "correct" && letter !== targets[b][i]) {
            evalData.pattern[i] = targets[b].includes(letter) ? "present" : "absent";
          }
        } else {
          evalData.pattern[i] = "correct";
        }
      }
    }

    for (let b = 0; b < targetCount; b++) {
      if (boardStates[b] && boardStates[b].solved) continue;
      const evalData = evaluations[b] || evaluations[0];

      for (let i = 0; i < wordLength; i++) {
        const tile = getTileElement(b, rowToAnimate, i);
        if (!tile) continue;

        if (isGivenTile(b, i)) continue;

        const backendChar = (evalData.guess && evalData.guess[i]) || (data.guess && data.guess[i]);
        let displayLetter = currentGuess[i] || (evalData.revealed_letters && evalData.revealed_letters[i]) || backendChar || "";

        const status = evalData.pattern[i];

        setTimeout(() => {
          tile.classList.add("flip");

          setTimeout(() => {
            const isUnrevealedHintSlot = evalData.revealed_letters && displayLetter === "." && status !== "correct";

            if (isUnrevealedHintSlot) {
              tile.innerText = "";
              tile.classList.add("disabled-tile");
            } else {
              tile.innerText = displayLetter;
              tile.classList.add(status);
              updateKeyStatus(displayLetter, status);
            }
          }, FLIP_DURATION / 2);
        }, i * STAGGER_DELAY);
      }
    }

    const totalAnimationTime = (wordLength - 1) * STAGGER_DELAY + FLIP_DURATION;

    setTimeout(async () => {
      isAnimating = false;

      evaluations.forEach((evalData, b) => {
        if (!boardStates[b].solved) {
          const isBoardWin = evalData.pattern.every((s) => s === "correct");
          if (isBoardWin) {
            boardStates[b].solved = true;
            boardStates[b].solvedAtAttempt = rowToAnimate;
          }
        }
      });

      const allSolved = boardStates.every((b) => b.solved);

      if (allSolved) {
        gameOver = true;
        gameEndState = {
          type: "win",
          messageIndex: Math.floor(Math.random() * TRANSLATIONS[currentLang].winMessages.length),
        };
        clearMessage();
        grayOutRemainingTiles();
        refreshUI();
        disableActionButtons();
        openModal();
        resolve();
        return;
      }

      currentAttempt++;

      if (currentAttempt >= maxAttempts) {
        gameOver = true;
        gameEndState = {
          type: "lose",
          targetWord: data.target_word || (data.target_words ? data.target_words.join(", ") : ""),
          messageIndex: Math.floor(Math.random() * TRANSLATIONS[currentLang].loseMessages.length),
        };
        clearMessage();
        grayOutRemainingTiles();
        refreshUI();
        disableActionButtons();
        openModal();
        resolve();
      } else {
        currentGuess = createEmptyGuessArray();
        cursorIndex = getFirstValidIndex();

        isAnimating = true;
        await revealGivenTilesForRow(currentAttempt);
        isAnimating = false;

        updateCurrentRow();
        resolve();
      }
    }, totalAnimationTime);
  });
}

async function giveUp() {
  if (gameOver || isAnimating) return;

  clearMessage();

  const data = await giveUpAPI();

  gameOver = true;
  gameEndState = {
    type: "giveup",
    targetWord: data.target_word,
    messageIndex: Math.floor(Math.random() * TRANSLATIONS[currentLang].giveupMessages.length),
  };

  for (let b = 0; b < targetCount; b++) {
    const activeTile = getTileElement(b, currentAttempt, cursorIndex);
    if (activeTile) activeTile.classList.remove("active-cursor");
  }

  clearMessage();
  grayOutRemainingTiles();
  refreshUI();
  disableActionButtons();
  openModal();
}

function grayOutRemainingTiles() {
  for (let b = 0; b < targetCount; b++) {
    for (let r = 0; r < maxAttempts; r++) {
      for (let c = 0; c < wordLength; c++) {
        const tile = getTileElement(b, r, c);
        if (!tile) continue;

        tile.classList.remove("active-cursor");

        if (isGivenTile(b, c) && r <= currentAttempt) {
          tile.className = "tile correct given-tile";
          tile.innerText = targets[b][c];
          continue;
        }

        const isEvaluated = tile.classList.contains("correct") || tile.classList.contains("present") || tile.classList.contains("absent");

        if (!isEvaluated) {
          tile.classList.add("disabled-tile");
        }
      }
    }
  }
}

// Expose necessary functions to the global window object to preserve inline HTML event handlers
window.changeLanguage = changeLanguage;
window.openThemeModal = openThemeModal;
window.closeThemeModal = closeThemeModal;
window.openRulesModal = openRulesModal;
window.closeRulesModal = closeRulesModal;
window.closeModal = closeModal;
window.useHint = useHint;
window.giveUp = giveUp;
window.openModal = openModal;

initGame();