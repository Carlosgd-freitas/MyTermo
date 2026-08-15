const TRANSLATIONS = {
    en: {
        giveUp: "Give Up",
        hint: "Hint",
        langLabel: "Language",
        themeBtn: "Theme",
        selectTheme: "Select Theme",
        absentLabel: "Absent",
        presentLabel: "Present",
        correctLabel: "Correct",
        noHints: "No hints left!",
        mustFill: (len) => `Fill all ${len} letters!`,
        wordWas: "The word was:",
        modalTitles: {
            win: "Victory!",
            lose: "Game Over",
            giveup: "Round Ended"
        },
        ok: "OK"
    },
    pt: {
        giveUp: "Desistir",
        hint: "Dica",
        langLabel: "Linguagem",
        themeBtn: "Tema",
        selectTheme: "Selecionar Tema",
        absentLabel: "Ausente",
        presentLabel: "Presente",
        correctLabel: "Correta",
        noHints: "Sem dicas restantes!",
        mustFill: (len) => `Preencha todas as ${len} letras!`,
        wordWas: "A palavra era:",
        modalTitles: {
            win: "Vitória!",
            lose: "Fim de Jogo",
            giveup: "Fim da Rodada"
        },
        ok: "OK"
    }
};

let currentLang = localStorage.getItem('termo_lang') || 'en';
let currentThemeId = localStorage.getItem('termo_theme') || 'classic';
let availableThemes = [];

let wordLength = 5;
let maxAttempts = 6;
let currentAttempt = 0;

let currentGuess = [];
let cursorIndex = 0;
let gameOver = false;
let gameEndState = null;

let isAnimating = false;
let messageTimeout = null;

let givenTiles = {};
let correctIndices = new Set();

const letterStatuses = {};

const KEYBOARD_LAYOUT = [
    ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
    ["A", "S", "D", "F", "G", "H", "J", "K", "L", "-"],
    ["ENTER", "Z", "X", "C", "V", "SPACE", "B", "N", "M", "DEL"]
];

const STATUS_PRIORITY = { "correct": 3, "present": 2, "absent": 1 };

/**
 * Checks whether a given column index contains a pre-filled/fixed character.
 * @param {number} index - Column index to check.
 * @returns {boolean} True if tile is fixed.
 */
function isFixedTile(index) {
    return index in givenTiles;
}

/**
 * Finds the first editable tile index in the word row.
 * @returns {number} Index of first non-fixed tile.
 */
function getFirstValidIndex() {
    for (let i = 0; i < wordLength; i++) {
        if (!isFixedTile(i)) return i;
    }
    return 0;
}

/**
 * Finds the last editable tile index in the word row.
 * @returns {number} Index of last non-fixed tile.
 */
function getLastValidIndex() {
    for (let i = wordLength - 1; i >= 0; i--) {
        if (!isFixedTile(i)) return i;
    }
    return 0;
}

/**
 * Calculates the next editable cursor position in a given direction.
 * @param {number} fromIndex - Current index.
 * @param {number} direction - Offset direction (+1 or -1).
 * @returns {number} Next valid tile index.
 */
function getNextValidIndex(fromIndex, direction) {
    let idx = fromIndex + direction;
    while (idx >= 0 && idx < wordLength) {
        if (!isFixedTile(idx)) {
            return idx;
        }
        idx += direction;
    }
    return direction > 0 ? getLastValidIndex() : getFirstValidIndex();
}

/**
 * Generates a clean guess buffer array respecting pre-filled given tiles.
 * @returns {string[]} Array initialized with fixed characters or empty strings.
 */
function createEmptyGuessArray() {
    return Array(wordLength).fill("").map((_, i) => {
        if (isFixedTile(i)) return givenTiles[i];
        return "";
    });
}

/**
 * Applies theme CSS root variables directly to document element.
 * @param {Object} theme - Theme object loaded from JSON.
 */
function applyTheme(theme) {
    if (!theme || !theme.colors) return;
    
    currentThemeId = theme.id;
    localStorage.setItem('termo_theme', currentThemeId);

    const root = document.documentElement;
    Object.entries(theme.colors).forEach(([key, value]) => {
        root.style.setProperty(`--${key}`, value);
    });
}

/**
 * Initializes game session, loads remote configuration and sets initial state.
 */
async function initGame() {
    clearMessage();

    try {
        const themeRes = await fetch('/api/themes');
        if (themeRes.ok) {
            availableThemes = await themeRes.json();
            
            const activeTheme = availableThemes.find(t => t.id === currentThemeId) || availableThemes[0];
            if (activeTheme) {
                applyTheme(activeTheme);
            }
            renderThemeModal();
        }
    } catch (e) {
        console.error("Failed to fetch themes from /api/themes", e);
    }

    try {
        const res = await fetch('/api/config');
        const config = await res.json();
        
        document.title = config.title;
        document.getElementById('game-title').innerText = config.title;

        wordLength = config.length;
        maxAttempts = config.max_attempts;

        givenTiles = config.given_tiles || {};
        correctIndices = new Set();

        Object.keys(givenTiles).forEach(idxStr => {
            correctIndices.add(parseInt(idxStr, 10));
        });

        currentGuess = createEmptyGuessArray();
        cursorIndex = getFirstValidIndex();

        document.documentElement.style.setProperty('--word-length', wordLength);

        updateLangToggleUI();
        updateUITexts();
        buildGrid();
        buildKeyboard();
        updateCurrentRow();

        document.addEventListener('keydown', handlePhysicalKeyboard);

        const givenCount = Object.keys(givenTiles).length;
        if (givenCount === wordLength && wordLength > 0) {
            gameOver = true;
            gameEndState = {
                type: 'win',
                messages: config.victory_messages
            };

            for (let c = 0; c < wordLength; c++) {
                const tile = document.getElementById(`tile-0-${c}`);
                if (tile) {
                    tile.classList.remove('given-tile', 'space-tile');
                    tile.classList.add('correct');
                }
            }

            grayOutRemainingTiles();
            updateUITexts();
            disableActionButtons();
            openModal();
        }
    } catch (e) {
        console.error("Failed to initialize game config", e);
    }
}

/** Opens theme selector modal window. */
function openThemeModal() {
    renderThemeModal();
    document.getElementById('theme-modal').classList.add('active');
}

/** Closes theme selector modal window. */
function closeThemeModal() {
    document.getElementById('theme-modal').classList.remove('active');
}

/** Renders cards inside theme modal based on configured themes. */
function renderThemeModal() {
    const themeGrid = document.getElementById('theme-grid');
    if (!themeGrid) return;
    
    themeGrid.innerHTML = '';

    availableThemes.forEach(theme => {
        const colors = theme.colors || {};
        
        const bg = colors['bg-color'] || colors.bg;
        const text = colors['text-color'] || colors.text;
        const absent = colors['absent-bg'] || colors.absent;
        const present = colors['present-bg'] || colors.present;
        const correct = colors['correct-bg'] || colors.correct;
        const border = colors['tile-border'] || colors['modal-border'] || '#4c4347';

        const card = document.createElement('div');
        card.className = `theme-card ${theme.id === currentThemeId ? 'active' : ''}`;
        
        card.style.setProperty('--p-bg', bg);
        card.style.setProperty('--p-text', text);
        card.style.setProperty('--p-absent', absent);
        card.style.setProperty('--p-present', present);
        card.style.setProperty('--p-correct', correct);
        card.style.setProperty('--tile-border', border);

        const langSelect = document.getElementById('lang-select');
        const lang = langSelect ? langSelect.value : currentLang;
        const themeName = (theme.name && (theme.name[lang] || theme.name.en)) || theme.id;

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

        card.onclick = () => {
            applyTheme(theme);
            renderThemeModal();
        };

        themeGrid.appendChild(card);
    });
}

/**
 * Updates application language state.
 * @param {string} lang - Language code ('en' or 'pt').
 */
function changeLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('termo_lang', lang);
    updateLangToggleUI();
    updateUITexts();
    renderThemeModal();
}

/** Syncs language selector dropdown value. */
function updateLangToggleUI() {
    const langSelect = document.getElementById('lang-select');
    if (langSelect) {
        langSelect.value = currentLang;
    }
}

/** Refreshes localized texts across active UI components and modals. */
function updateUITexts() {
    const langLabel = document.getElementById('lang-label');
    if (langLabel) langLabel.textContent = TRANSLATIONS[currentLang].langLabel;

    const giveUpBtn = document.getElementById('giveup-btn');
    if (giveUpBtn) giveUpBtn.innerText = TRANSLATIONS[currentLang].giveUp;

    const hintBtn = document.getElementById('hint-btn');
    if (hintBtn) hintBtn.innerText = TRANSLATIONS[currentLang].hint;

    const themeBtn = document.getElementById('theme-btn');
    if (themeBtn) themeBtn.innerText = TRANSLATIONS[currentLang].themeBtn;

    const themeModalTitle = document.getElementById('theme-modal-title');
    if (themeModalTitle) themeModalTitle.innerText = TRANSLATIONS[currentLang].selectTheme;

    if (gameEndState) {
        const t = TRANSLATIONS[currentLang];
        const text = gameEndState.messages[currentLang];

        document.getElementById('modal-title').innerText = t.modalTitles[gameEndState.type] || "";
        document.getElementById('modal-message').innerText = text;

        const wordContainer = document.getElementById('modal-word-container');
        if (gameEndState.type === 'lose' || gameEndState.type === 'giveup') {
            wordContainer.style.display = 'block';
            document.getElementById('modal-word-label').innerText = t.wordWas;
            document.getElementById('modal-word').innerText = gameEndState.targetWord;
        } else {
            wordContainer.style.display = 'none';
        }

        document.querySelector('.modal-close-btn').innerText = t.ok;

        const modalEl = document.getElementById('endgame-modal');
        if (modalEl && modalEl.classList.contains('active')) {
            openModal();
        }
    }
}

/** Display victory/defeat/pity endgame modal window. */
function openModal() {
    clearMessage();
    document.getElementById('endgame-modal').classList.add('active');
}

/** Close active modal window. */
function closeModal() {
    document.getElementById('endgame-modal').classList.remove('active');
}

/** Constructs active board grid DOM elements. */
function buildGrid() {
    const grid = document.getElementById('grid');
    grid.innerHTML = '';

    for (let r = 0; r < maxAttempts; r++) {
        const row = document.createElement('div');
        row.className = 'row';

        for (let c = 0; c < wordLength; c++) {
            const tile = document.createElement('div');
            tile.id = `tile-${r}-${c}`;

            if (isFixedTile(c)) {
                const char = givenTiles[c];
                if (char === ' ') {
                    tile.className = 'tile space-tile';
                } else {
                    tile.className = 'tile given-tile';
                    tile.innerText = char;
                }
            } else {
                tile.className = 'tile';
                tile.addEventListener('click', () => {
                    if (!gameOver && r === currentAttempt) {
                        cursorIndex = c;
                        updateCurrentRow();
                    }
                });
            }

            row.appendChild(tile);
        }
        grid.appendChild(row);
    }
}

/** Constructs virtual keyboard buttons DOM elements. */
function buildKeyboard() {
    const keyboard = document.getElementById('keyboard');
    keyboard.innerHTML = '';

    KEYBOARD_LAYOUT.forEach(rowKeys => {
        const row = document.createElement('div');
        row.className = 'keyboard-row';

        rowKeys.forEach(keyText => {
            const button = document.createElement('button');
            button.className = 'key';
            button.innerText = keyText;
            button.id = `key-${keyText}`;

            if (keyText === 'ENTER' || keyText === 'DEL') {
                button.classList.add('large');
            } else if (keyText === 'SPACE') {
                button.classList.add('space-bar-key');
            }

            button.addEventListener('click', () => {
                if (!gameOver) processInput(keyText);
            });

            row.appendChild(button);
        });

        keyboard.appendChild(row);
    });
}

/**
 * Handles physical keyboard listener events.
 * @param {KeyboardEvent} e - Keyboard event object.
 */
function handlePhysicalKeyboard(e) {
    if (gameOver || isAnimating) return;

    if (e.key === 'Enter') {
        processInput('ENTER');
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
        processInput('DEL');
    } else if (e.key === ' ' || e.code === 'Space') {
        processInput('SPACE');
    } else if (e.key === 'ArrowLeft') {
        cursorIndex = getNextValidIndex(cursorIndex, -1);
        updateCurrentRow();
    } else if (e.key === 'ArrowRight') {
        cursorIndex = getNextValidIndex(cursorIndex, 1);
        updateCurrentRow();
    } else {
        const normalizedKey = e.key
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toUpperCase();

        if (/^[A-Z\-]$/.test(normalizedKey)) {
            processInput(normalizedKey);
        }
    }
}

/**
 * Process key command or character into guess state buffer.
 * @param {string} key - Pressed character or special action string.
 */
function processInput(key) {
    if (gameOver || isAnimating) return;

    if (isFixedTile(cursorIndex)) {
        cursorIndex = getFirstValidIndex();
    }

    if (key === 'ENTER') {
        submitGuess();
    } else if (key === 'DEL') {
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
    } else if (key === 'SPACE' || /^[A-Z\-]$/.test(key)) {
        if (!isFixedTile(cursorIndex)) {
            currentGuess[cursorIndex] = key === 'SPACE' ? ' ' : key;
            const nextIndex = getNextValidIndex(cursorIndex, 1);
            if (nextIndex > cursorIndex) {
                cursorIndex = nextIndex;
            }
        }
        updateCurrentRow();
    }
}

/** Re-renders current active attempt row tiles. */
function updateCurrentRow() {
    for (let c = 0; c < wordLength; c++) {
        const tile = document.getElementById(`tile-${currentAttempt}-${c}`);
        if (!tile) continue;

        if (isFixedTile(c)) {
            const char = givenTiles[c];
            if (char === ' ') {
                tile.className = "tile space-tile";
                tile.innerText = "";
            } else {
                tile.className = "tile given-tile";
                tile.innerText = char;
            }
            continue;
        }

        const letter = currentGuess[c] || "";
        tile.innerText = letter;
        tile.className = "tile";

        if (letter) {
            tile.classList.add('filled');
        }

        if (c === cursorIndex && !gameOver) {
            tile.classList.add('active-cursor');
        }
    }
}

/** Requests a hint from server API and triggers row reveal animation. */
async function useHint() {
    if (gameOver || isAnimating) return;

    clearMessage();
    isAnimating = true;

    currentGuess = createEmptyGuessArray();
    updateCurrentRow();

    try {
        const response = await fetch('/api/hint', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ revealed_indices: Array.from(correctIndices) })
        });

        const data = await response.json();

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

/** Submits current guess attempt to server API. */
async function submitGuess() {
    if (gameOver || isAnimating) return;

    clearMessage();

    if (currentGuess.some((char, idx) => !isFixedTile(idx) && char === "")) {
        const fillLength = wordLength - Object.keys(givenTiles).length;
        showMessage(TRANSLATIONS[currentLang].mustFill(fillLength));
        return;
    }

    isAnimating = true;
    const wordToSubmit = currentGuess.join("");

    try {
        const response = await fetch('/api/guess', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ word: wordToSubmit })
        });

        const data = await response.json();

        if (data.error) {
            isAnimating = false;
            showMessage(data.error);
            return;
        }

        data.pattern.forEach((status, idx) => {
            if (status === 'correct') correctIndices.add(idx);
        });

        await animateAndProcessResult(data);
    } catch (err) {
        isAnimating = false;
        console.error(err);
    }
}

/**
 * Animates tile reveals for attempt/hint result and updates game state.
 * @param {Object} data - Server result object.
 * @returns {Promise<void>} Resolves when flip animation completes.
 */
function animateAndProcessResult(data) {
    return new Promise((resolve) => {
        isAnimating = true;
        const rowToAnimate = currentAttempt;

        const currentCursorTile = document.getElementById(`tile-${rowToAnimate}-${cursorIndex}`);
        if (currentCursorTile) currentCursorTile.classList.remove('active-cursor');

        const FLIP_DURATION = 500;
        const STAGGER_DELAY = 250;

        for (let i = 0; i < wordLength; i++) {
            const tile = document.getElementById(`tile-${rowToAnimate}-${i}`);
            if (!tile || isFixedTile(i)) continue;

            const letter = data.guess[i];
            const status = data.pattern[i];
            const displayLetter = data.revealed_letters ? data.revealed_letters[i] : letter;

            setTimeout(() => {
                tile.classList.add('flip');

                setTimeout(() => {
                    const isUnrevealedHintSlot = data.revealed_letters && displayLetter === '.' && status !== 'correct';

                    if (isUnrevealedHintSlot) {
                        tile.innerText = '';
                        tile.classList.add('disabled-tile');
                    } else {
                        tile.innerText = displayLetter;
                        tile.classList.add(status);
                        updateKeyStatus(displayLetter, status);
                    }
                }, FLIP_DURATION / 2);

            }, i * STAGGER_DELAY);
        }

        const totalAnimationTime = (wordLength - 1) * STAGGER_DELAY + FLIP_DURATION;

        setTimeout(() => {
            isAnimating = false;
            const isWin = data.pattern.every((s, idx) => isFixedTile(idx) || s === "correct");

            if (isWin) {
                gameOver = true;
                gameEndState = {
                    type: 'win',
                    messages: data.victory_messages
                };
                clearMessage();
                grayOutRemainingTiles();
                updateUITexts();
                disableActionButtons();
                openModal();
                resolve();
                return;
            }

            currentAttempt++;

            if (currentAttempt >= maxAttempts) {
                gameOver = true;
                gameEndState = {
                    type: 'lose',
                    targetWord: data.target_word,
                    messages: data.fail_messages
                };
                clearMessage();
                grayOutRemainingTiles();
                updateUITexts();
                disableActionButtons();
                openModal();
            } else {
                currentGuess = createEmptyGuessArray();
                cursorIndex = getFirstValidIndex();
                updateCurrentRow();
            }
            resolve();
        }, totalAnimationTime);
    });
}

/** Surrenders current game match immediately. */
async function giveUp() {
    if (gameOver || isAnimating) return;

    clearMessage();

    const response = await fetch('/api/give-up', { method: 'POST' });
    const data = await response.json();

    gameOver = true;
    gameEndState = {
        type: 'giveup',
        targetWord: data.target_word,
        messages: data.messages
    };

    const activeTile = document.getElementById(`tile-${currentAttempt}-${cursorIndex}`);
    if (activeTile) activeTile.classList.remove('active-cursor');

    clearMessage();
    grayOutRemainingTiles();
    updateUITexts();
    disableActionButtons();
    openModal();
}

/** Disables action buttons when game is finished. */
function disableActionButtons() {
    const giveUpBtn = document.getElementById('giveup-btn');
    if (giveUpBtn) giveUpBtn.disabled = true;

    const hintBtn = document.getElementById('hint-btn');
    if (hintBtn) hintBtn.disabled = true;
}

/**
 * Updates keyboard key status colors based on status hierarchy.
 * @param {string} letter - Key character.
 * @param {string} newStatus - Match status ('correct', 'present', 'absent').
 */
function updateKeyStatus(letter, newStatus) {
    const currentStatus = letterStatuses[letter];

    if (!currentStatus || STATUS_PRIORITY[newStatus] > STATUS_PRIORITY[currentStatus]) {
        letterStatuses[letter] = newStatus;
        
        const keyBtn = document.getElementById(`key-${letter}`);
        if (keyBtn) {
            keyBtn.classList.remove('correct', 'present', 'absent');
            keyBtn.classList.add(newStatus);
        }
    }
}

/**
 * Display temporary message string above board grid.
 * @param {string} text - Message text.
 */
function showMessage(text) {
    const msgEl = document.getElementById('message');
    if (!msgEl) return;

    msgEl.innerText = text;
    if (messageTimeout) clearTimeout(messageTimeout);

    messageTimeout = setTimeout(() => {
        msgEl.innerText = '';
    }, 3000);
}

/** Clears temporary UI banner text. */
function clearMessage() {
    const msgEl = document.getElementById('message');
    if (msgEl) msgEl.innerText = '';

    if (messageTimeout) {
        clearTimeout(messageTimeout);
        messageTimeout = null;
    }
}

/** Grays out remaining un-evaluated tiles across board. */
function grayOutRemainingTiles() {
    for (let r = 0; r < maxAttempts; r++) {
        for (let c = 0; c < wordLength; c++) {
            const tile = document.getElementById(`tile-${r}-${c}`);
            if (!tile) continue;

            tile.classList.remove('active-cursor');

            if (isFixedTile(c)) {
                const char = givenTiles[c];
                if (char === ' ') {
                    tile.className = "tile space-tile";
                    tile.innerText = "";
                } else {
                    tile.className = "tile given-tile";
                    tile.innerText = char;
                }
                continue;
            }

            const isEvaluated = tile.classList.contains('correct') || 
                                tile.classList.contains('present') || 
                                tile.classList.contains('absent');

            if (!isEvaluated) {
                tile.classList.add('disabled-tile');
            }
        }
    }
}

initGame();