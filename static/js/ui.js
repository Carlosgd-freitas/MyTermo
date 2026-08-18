// static/js/ui.js

const KEYBOARD_LAYOUT = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L", "-", "&"],
  ["ENTER", "Z", "X", "C", "V", " ", "B", "N", "M", "DEL"],
];

const STATUS_PRIORITY = { correct: 3, present: 2, absent: 1 };
const letterStatuses = {};
let messageTimeout = null;

export function getTileElement(boardIdx, rowIdx, colIdx) {
  return document.getElementById(`tile-${boardIdx}-${rowIdx}-${colIdx}`);
}

export function applyTheme(theme) {
  if (!theme || !theme.colors) return;

  localStorage.setItem("termo_theme", theme.id);

  const root = document.documentElement;
  Object.entries(theme.colors).forEach(([key, value]) => {
    root.style.setProperty(`--${key}`, value);
  });
  
  return theme.id;
}

export function renderThemeModal(availableThemes, currentThemeId, currentLang, onThemeSelect) {
  const themeGrid = document.getElementById("theme-grid");
  if (!themeGrid) return;

  themeGrid.innerHTML = "";

  availableThemes.forEach((theme) => {
    const colors = theme.colors || {};

    const bg = colors["bg-color"] || colors.bg;
    const text = colors["text-color"] || colors.text;
    const absent = colors["absent-bg"] || colors.absent;
    const present = colors["present-bg"] || colors.present;
    const correct = colors["correct-bg"] || colors.correct;
    const border = colors["tile-border"] || colors["modal-border"] || "#4c4347";

    const card = document.createElement("div");
    card.className = `theme-card ${theme.id === currentThemeId ? "active" : ""}`;

    card.style.setProperty("--p-bg", bg);
    card.style.setProperty("--p-text", text);
    card.style.setProperty("--p-absent", absent);
    card.style.setProperty("--p-present", present);
    card.style.setProperty("--p-correct", correct);
    card.style.setProperty("--tile-border", border);

    const themeName = (theme.name && (theme.name[currentLang] || theme.name.en)) || theme.id;

    card.innerHTML = `
            <div class="theme-card-title">${themeName}</div>
            <div class="theme-preview-box">
                <div class="preview-tiles-row">
                    <div class="preview-tile absent">A</div>
                    <div class="preview-tile present">B</div>
                    <div class="preview-tile correct">C</div>
                </div>
            </div>
        `;

    card.onclick = () => onThemeSelect(theme);

    themeGrid.appendChild(card);
  });
}

export function openThemeModal() { document.getElementById("theme-modal").classList.add("active"); }
export function closeThemeModal() { document.getElementById("theme-modal").classList.remove("active"); }
export function openRulesModal() { document.getElementById("rules-modal").classList.add("active"); }
export function closeRulesModal() { document.getElementById("rules-modal").classList.remove("active"); }
export function openModal() { clearMessage(); document.getElementById("endgame-modal").classList.add("active"); }
export function closeModal() { document.getElementById("endgame-modal").classList.remove("active"); }

export function updateLangToggleUI(currentLang) {
  const langSelect = document.getElementById("lang-select");
  if (langSelect) {
    langSelect.value = currentLang;
  }
}

export function updateUITexts(currentLang, targetCount, gameEndState, openModalCallback) {
  if (typeof TRANSLATIONS === "undefined") {
    console.error("CRITICAL: translations.js failed to load!");
    return;
  }

  if (!TRANSLATIONS[currentLang]) {
    console.warn(`Language '${currentLang}' not found, defaulting to 'en'`);
    currentLang = "en";
    localStorage.setItem("termo_lang", "en");
  }

  const langLabel = document.getElementById("lang-label");
  if (langLabel) langLabel.textContent = TRANSLATIONS[currentLang].langLabel;

  const giveUpBtn = document.getElementById("giveup-btn");
  if (giveUpBtn) {
    giveUpBtn.innerText = TRANSLATIONS[currentLang].giveUp;
    giveUpBtn.removeAttribute("title");
    giveUpBtn.setAttribute("data-tooltip", TRANSLATIONS[currentLang].giveUpTooltip);
  }

  const hintBtn = document.getElementById("hint-btn");
  if (hintBtn) {
    hintBtn.innerText = TRANSLATIONS[currentLang].hint;
    hintBtn.removeAttribute("title");
    hintBtn.setAttribute("data-tooltip", TRANSLATIONS[currentLang].hintTooltip);
  }

  const infoBtn = document.getElementById("info-btn");
  if (infoBtn) {
    infoBtn.innerText = TRANSLATIONS[currentLang].info;
    infoBtn.removeAttribute("title");
    infoBtn.setAttribute("data-tooltip", TRANSLATIONS[currentLang].infoTooltip);
  }

  const themeBtn = document.getElementById("theme-btn");
  if (themeBtn) themeBtn.innerText = TRANSLATIONS[currentLang].themeBtn;

  const themeModalTitle = document.getElementById("theme-modal-title");
  if (themeModalTitle) themeModalTitle.innerText = TRANSLATIONS[currentLang].selectTheme;

  const subjectBoxTitle = document.getElementById("subject-box-title");
  if (subjectBoxTitle) subjectBoxTitle.innerText = TRANSLATIONS[currentLang].subjectTitle;

  const rulesTitle = document.getElementById("rules-title");
  if (rulesTitle) rulesTitle.innerText = TRANSLATIONS[currentLang].rules.title;

  const rulesDesc = document.getElementById("rules-desc");
  if (rulesDesc) rulesDesc.innerText = TRANSLATIONS[currentLang].rules.desc;

  const rulesCorrect = document.getElementById("rules-correct-ex");
  if (rulesCorrect) rulesCorrect.innerText = TRANSLATIONS[currentLang].rules.correct;

  const rulesPresent = document.getElementById("rules-present-ex");
  if (rulesPresent) rulesPresent.innerText = TRANSLATIONS[currentLang].rules.present;

  const rulesAbsent = document.getElementById("rules-absent-ex");
  if (rulesAbsent) rulesAbsent.innerText = TRANSLATIONS[currentLang].rules.absent;

  const closeRulesBtn = document.getElementById("close-rules-btn");
  if (closeRulesBtn) closeRulesBtn.innerText = TRANSLATIONS[currentLang].ok;

  const spaceKey = document.getElementById("key-SPACE");
  if (spaceKey) spaceKey.innerText = TRANSLATIONS[currentLang].spaceBtn;

  const targetBadge = document.getElementById("target-badge");
  if (targetBadge) {
    targetBadge.textContent = TRANSLATIONS[currentLang].targetLabel(targetCount);
  }

  if (gameEndState) {
    const t = TRANSLATIONS[currentLang];
    const messagesList = t[`${gameEndState.type}Messages`];
    const text = messagesList[gameEndState.messageIndex];

    document.getElementById("modal-title").innerText = t.modalTitles[gameEndState.type] || "";
    document.getElementById("modal-message").innerText = text;

    const wordContainer = document.getElementById("modal-word-container");
    if (gameEndState.type === "lose" || gameEndState.type === "giveup") {
      wordContainer.style.display = "block";
      document.getElementById("modal-word-label").innerText = t.wordWas;
      document.getElementById("modal-word").innerText = gameEndState.targetWord;
    } else {
      wordContainer.style.display = "none";
    }

    document.querySelectorAll(".modal-close-btn").forEach((btn) => {
      btn.innerText = t.ok;
    });

    const modalEl = document.getElementById("endgame-modal");
    if (modalEl && modalEl.classList.contains("active")) {
      openModalCallback();
    }
  }
}

export function buildGrid(targetCount, maxAttempts, wordLength, onTileClick) {
  const grid = document.getElementById("grid");
  grid.innerHTML = "";

  for (let b = 0; b < targetCount; b++) {
    if (b > 0) {
      const divider = document.createElement("div");
      divider.className = "board-divider";
      grid.appendChild(divider);
    }

    const board = document.createElement("div");
    board.className = "board";
    board.id = `board-${b}`;

    for (let r = 0; r < maxAttempts; r++) {
      const row = document.createElement("div");
      row.className = "row";

      for (let c = 0; c < wordLength; c++) {
        const tile = document.createElement("div");
        tile.id = `tile-${b}-${r}-${c}`;
        tile.className = "tile";

        tile.addEventListener("click", () => onTileClick(r, c));

        row.appendChild(tile);
      }
      board.appendChild(row);
    }
    grid.appendChild(board);
  }
}

export function buildKeyboard(onKeyPress) {
  const keyboard = document.getElementById("keyboard");
  keyboard.innerHTML = "";

  KEYBOARD_LAYOUT.forEach((rowKeys) => {
    const row = document.createElement("div");
    row.className = "keyboard-row";

    rowKeys.forEach((keyText) => {
      const button = document.createElement("button");
      button.className = "key";
      button.innerText = keyText;

      button.id = keyText === " " ? "key-SPACE" : `key-${keyText}`;

      if (keyText === "ENTER" || keyText === "DEL") {
        button.classList.add("large");
      } else if (keyText === " ") {
        button.classList.add("space-bar-key");
      }

      button.addEventListener("click", () => onKeyPress(keyText));

      row.appendChild(button);
    });

    keyboard.appendChild(row);
  });
}

export function disableActionButtons() {
  const giveUpBtn = document.getElementById("giveup-btn");
  if (giveUpBtn) giveUpBtn.disabled = true;

  const hintBtn = document.getElementById("hint-btn");
  if (hintBtn) hintBtn.disabled = true;

  const infoBtn = document.getElementById("info-btn");
  if (infoBtn) infoBtn.disabled = true;
}

export function updateKeyStatus(letter, newStatus) {
  if (!letter) return;

  const keyId = letter === " " ? "SPACE" : letter;
  const currentStatus = letterStatuses[keyId];

  if (!currentStatus || STATUS_PRIORITY[newStatus] > STATUS_PRIORITY[currentStatus]) {
    letterStatuses[keyId] = newStatus;

    const keyBtn = document.getElementById(`key-${keyId}`);
    if (keyBtn) {
      keyBtn.classList.remove("correct", "present", "absent");
      keyBtn.classList.add(newStatus);
    }
  }
}

export function showMessage(text) {
  const msgEl = document.getElementById("message");
  if (!msgEl) return;

  msgEl.innerText = text;
  if (messageTimeout) clearTimeout(messageTimeout);

  messageTimeout = setTimeout(() => {
    msgEl.innerText = "";
  }, 3000);
}

export function clearMessage() {
  const msgEl = document.getElementById("message");
  if (!msgEl) return;
  msgEl.innerText = "";

  if (messageTimeout) {
    clearTimeout(messageTimeout);
    messageTimeout = null;
  }
}

export function buildSubjectBox(text, imageUrl, lang) {
  const existingBox = document.getElementById('subject-box');
  if (existingBox) existingBox.remove();

  if (!text && !imageUrl) return;

  const grid = document.getElementById('grid');
  
  let wrapper = document.getElementById('game-board-wrapper');
  if (!wrapper) {
    wrapper = document.createElement('div');
    wrapper.id = 'game-board-wrapper';
    grid.parentNode.insertBefore(wrapper, grid);
    wrapper.appendChild(grid);
  }

  const subjectBox = document.createElement('div');
  subjectBox.id = 'subject-box';
  subjectBox.className = 'subject-box';
  
  const titleText = (typeof TRANSLATIONS !== "undefined" && TRANSLATIONS[lang]) 
    ? TRANSLATIONS[lang].subjectTitle 
    : "Subject";

  let innerHTML = `
    <div class="subject-title-bar" id="subject-box-title">${titleText}</div>
    <div class="subject-content">
  `;
  
  if (imageUrl) {
    innerHTML += `<img src="${imageUrl}" alt="Hint" class="subject-image" />`;
  }
  if (text) {
    innerHTML += `<div class="subject-text">${text}</div>`;
  }
  
  innerHTML += `</div><div class="subject-cover">?</div>`;
  
  subjectBox.innerHTML = innerHTML;
  
  subjectBox.addEventListener('click', () => {
    subjectBox.classList.add('revealed');
  });

  wrapper.insertBefore(subjectBox, grid);
}
