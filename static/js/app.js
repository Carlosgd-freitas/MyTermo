let currentLang = localStorage.getItem('termo_lang') || 'en';
let currentThemeId = localStorage.getItem('termo_theme') || 'classic';
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
let messageTimeout = null;

let givenTiles = [];
let correctIndices = new Set();
let boardStates = [];

const letterStatuses = {};

const KEYBOARD_LAYOUT = [
    ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
    ["A", "S", "D", "F", "G", "H", "J", "K", "L", "-"],
    ["ENTER", "Z", "X", "C", "V", "SPACE", "B", "N", "M", "DEL"]
];

const STATUS_PRIORITY = { "correct": 3, "present": 2, "absent": 1 };

/** Checks if a specific tile position on a specific board contains a given tile character. */
function isGivenTile(boardIdx, colIdx) {
    if (targets[boardIdx] && targets[boardIdx][colIdx]) {
        return givenTiles.includes(targets[boardIdx][colIdx]);
    }
    return false;
}

/** Finds the first editable tile index in the word row. */
function getFirstValidIndex() {
    return 0;
}

/** Finds the last editable tile index in the word row. */
function getLastValidIndex() {
    return wordLength - 1;
}

/** Calculates the next editable cursor position in a given direction. */
function getNextValidIndex(fromIndex, direction) {
    let idx = fromIndex + direction;
    if (idx < 0) return 0;
    if (idx >= wordLength) return wordLength - 1;
    return idx;
}

/** Retrieves tile DOM element for a specific board, row, and column index. */
function getTileElement(boardIdx, rowIdx, colIdx) {
    return document.getElementById(`tile-${boardIdx}-${rowIdx}-${colIdx}`);
}

/** Generates a completely empty guess buffer array. */
function createEmptyGuessArray() {
    return Array(wordLength).fill("");
}

/** Applies theme CSS root variables directly to document element. */
function applyTheme(theme) {
    if (!theme || !theme.colors) return;
    
    currentThemeId = theme.id;
    localStorage.setItem('termo_theme', currentThemeId);

    const root = document.documentElement;
    Object.entries(theme.colors).forEach(([key, value]) => {
        root.style.setProperty(`--${key}`, value);
    });
}

/** Initializes game session, loads remote configuration and sets initial state. */
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
        targets = config.targets || config.target || [];
        if (typeof targets === 'string') targets = [targets];
        
        targetCount = config.target_count ?? targets.length ?? 1;
        maxAttempts = config.max_attempts;

        givenTiles = config.given_tiles || [];
        correctIndices = new Set();

        currentGuess = createEmptyGuessArray();
        cursorIndex = getFirstValidIndex();

        document.documentElement.style.setProperty('--word-length', wordLength);

        updateLangToggleUI();
        updateUITexts();

        // Check if all targets are solved immediately by given tiles alone
        boardStates = Array.from({ length: targetCount }, (_, b) => {
            const targetWord = targets[b] || "";
            const isSolved = targetWord.length > 0 && targetWord.split('').every(char => givenTiles.includes(char));
            return { solved: isSolved, solvedAtAttempt: isSolved ? 0 : null };
        });

        buildGrid();
        buildKeyboard();
        updateCurrentRow();

        document.addEventListener('keydown', handlePhysicalKeyboard);

        // Immediate victory if boards are fully pre-populated
        if (boardStates.every(b => b.solved)) {
            gameOver = true;
            gameEndState = {
                type: 'win',
                messageIndex: Math.floor(Math.random() * TRANSLATIONS[currentLang].winMessages.length)
            };
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

/** Opens the Rules/Info modal window. */
function openRulesModal() {
    updateUITexts(); // Ensure texts are updated to current language before opening
    document.getElementById('rules-modal').classList.add('active');
}

/** Closes the Rules/Info modal window. */
function closeRulesModal() {
    document.getElementById('rules-modal').classList.remove('active');
}

/** Updates application language state. */
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
    // 1. Circuit Breaker: If the file failed to load, stop before crashing.
    if (typeof TRANSLATIONS === 'undefined') {
        console.error("CRITICAL: translations.js failed to load!");
        return; 
    }

    // 2. Fallback: If local storage has a corrupted language, default to English.
    if (!TRANSLATIONS[currentLang]) {
        console.warn(`Language '${currentLang}' not found, defaulting to 'en'`);
        currentLang = 'en';
        localStorage.setItem('termo_lang', 'en');
    }

    const langLabel = document.getElementById('lang-label');
    if (langLabel) langLabel.textContent = TRANSLATIONS[currentLang].langLabel;

    const giveUpBtn = document.getElementById('giveup-btn');
    if (giveUpBtn) giveUpBtn.innerText = TRANSLATIONS[currentLang].giveUp;

    const hintBtn = document.getElementById('hint-btn');
    if (hintBtn) hintBtn.innerText = TRANSLATIONS[currentLang].hint;

    const infoBtn = document.getElementById('info-btn');
    if (infoBtn) infoBtn.innerText = TRANSLATIONS[currentLang].info;

    const themeBtn = document.getElementById('theme-btn');
    if (themeBtn) themeBtn.innerText = TRANSLATIONS[currentLang].themeBtn;

    const themeModalTitle = document.getElementById('theme-modal-title');
    if (themeModalTitle) themeModalTitle.innerText = TRANSLATIONS[currentLang].selectTheme;

    const rulesTitle = document.getElementById('rules-title');
    if (rulesTitle) rulesTitle.innerText = TRANSLATIONS[currentLang].rules.title;
    
    const rulesDesc = document.getElementById('rules-desc');
    if (rulesDesc) rulesDesc.innerText = TRANSLATIONS[currentLang].rules.desc;
    
    const rulesCorrect = document.getElementById('rules-correct-ex');
    if (rulesCorrect) rulesCorrect.innerText = TRANSLATIONS[currentLang].rules.correct;
    
    const rulesPresent = document.getElementById('rules-present-ex');
    if (rulesPresent) rulesPresent.innerText = TRANSLATIONS[currentLang].rules.present;
    
    const rulesAbsent = document.getElementById('rules-absent-ex');
    if (rulesAbsent) rulesAbsent.innerText = TRANSLATIONS[currentLang].rules.absent;

    const closeRulesBtn = document.getElementById('close-rules-btn');
    if (closeRulesBtn) closeRulesBtn.innerText = TRANSLATIONS[currentLang].ok;

    const targetBadge = document.getElementById('target-badge');
    if (targetBadge) {
        targetBadge.textContent = TRANSLATIONS[currentLang].targetLabel(targetCount);
    }

    if (gameEndState) {
        const t = TRANSLATIONS[currentLang];
        const messagesList = t[`${gameEndState.type}Messages`];
        const text = messagesList[gameEndState.messageIndex];

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

        // Note: querySelectorAll ensures we catch the OK button on both modals
        document.querySelectorAll('.modal-close-btn').forEach(btn => {
            btn.innerText = t.ok;
        });

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

/** Constructs active board grid DOM elements per target board. */
function buildGrid() {
    const grid = document.getElementById('grid');
    grid.innerHTML = '';

    for (let b = 0; b < targetCount; b++) {
        if (b > 0) {
            const divider = document.createElement('div');
            divider.className = 'board-divider';
            grid.appendChild(divider);
        }

        const board = document.createElement('div');
        board.className = 'board';
        board.id = `board-${b}`;

        for (let r = 0; r < maxAttempts; r++) {
            const row = document.createElement('div');
            row.className = 'row';

            for (let c = 0; c < wordLength; c++) {
                const tile = document.createElement('div');
                tile.id = `tile-${b}-${r}-${c}`;
                tile.className = 'tile';

                // Future rows highlight given tiles. (updateCurrentRow clears this for the active row)
                if (isGivenTile(b, c)) {
                    tile.classList.add('correct');
                    tile.innerText = targets[b][c];
                }

                tile.addEventListener('click', () => {
                    if (!gameOver && r === currentAttempt) {
                        cursorIndex = c;
                        updateCurrentRow();
                    }
                });

                row.appendChild(tile);
            }
            board.appendChild(row);
        }
        grid.appendChild(board);
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

/** Handles physical keyboard listener events. */
function handlePhysicalKeyboard(e) {
    if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
    }

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

/** Process key command or character into guess state buffer. */
function processInput(key) {
    if (gameOver || isAnimating) return;

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
        currentGuess[cursorIndex] = key === 'SPACE' ? ' ' : key;
        const nextIndex = getNextValidIndex(cursorIndex, 1);
        if (nextIndex > cursorIndex) {
            cursorIndex = nextIndex;
        }
        updateCurrentRow();
    }
}

/** Re-renders current active attempt row tiles across all active target boards. */
function updateCurrentRow() {
    for (let b = 0; b < targetCount; b++) {
        if (boardStates[b] && boardStates[b].solved) continue;

        for (let c = 0; c < wordLength; c++) {
            const tile = getTileElement(b, currentAttempt, c);
            if (!tile) continue;

            const typedLetter = currentGuess[c] || "";
            
            // The tile's visual character is firmly locked to the given tile if it exists for this specific board.
            // This prevents the shared typing buffer from incorrectly overriding visual target characters across boards.
            const displayChar = isGivenTile(b, c) ? targets[b][c] : typedLetter;

            tile.innerText = displayChar;
            tile.className = "tile";

            if (displayChar !== '') {
                tile.classList.add('filled');
            }

            if (c === cursorIndex && !gameOver) {
                tile.classList.add('active-cursor');
            }
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

    if (currentGuess.some(char => char === "")) {
        showMessage(TRANSLATIONS[currentLang].mustFill(wordLength));
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

        await animateAndProcessResult(data);
    } catch (err) {
        isAnimating = false;
        console.error(err);
    }
}

/** Animates tile reveals for attempt/hint result and updates game state. */
function animateAndProcessResult(data) {
    return new Promise((resolve) => {
        isAnimating = true;
        const rowToAnimate = currentAttempt;

        for (let b = 0; b < targetCount; b++) {
            const activeCursorTile = getTileElement(b, rowToAnimate, cursorIndex);
            if (activeCursorTile) activeCursorTile.classList.remove('active-cursor');
        }

        const FLIP_DURATION = 500;
        const STAGGER_DELAY = 250;
        const evaluations = data.evaluations || [data];

        // Pass 1: Sanitize evaluations
        for (let b = 0; b < targetCount; b++) {
            if (boardStates[b] && boardStates[b].solved) continue;
            const evalData = evaluations[b] || evaluations[0];

            for (let i = 0; i < wordLength; i++) {
                const backendChar = (evalData.guess && evalData.guess[i]) || (data.guess && data.guess[i]);
                const letter = currentGuess[i] || backendChar || "";

                // If it's a locked given tile for THIS board, it's inherently correct. 
                // Skip the false victory sanitization demotion.
                if (!isGivenTile(b, i)) {
                    if (evalData.pattern[i] === 'correct' && letter !== targets[b][i]) {
                        evalData.pattern[i] = targets[b].includes(letter) ? 'present' : 'absent';
                    }
                } else {
                    evalData.pattern[i] = 'correct'; 
                }
            }
        }

        // Pass 2: Execute flip animations
        for (let b = 0; b < targetCount; b++) {
            if (boardStates[b] && boardStates[b].solved) continue;
            const evalData = evaluations[b] || evaluations[0];

            for (let i = 0; i < wordLength; i++) {
                const tile = getTileElement(b, rowToAnimate, i);
                if (!tile) continue; 

                const backendChar = (evalData.guess && evalData.guess[i]) || (data.guess && data.guess[i]);
                let displayLetter = currentGuess[i] || 
                    (evalData.revealed_letters && evalData.revealed_letters[i]) || 
                    backendChar || 
                    "";

                // Ensure it flips to reveal its strictly mapped given character
                if (isGivenTile(b, i)) {
                    displayLetter = targets[b][i];
                }

                const status = evalData.pattern[i];

                setTimeout(() => {
                    tile.classList.add('flip');

                    setTimeout(() => {
                        const isUnrevealedHintSlot = evalData.revealed_letters && displayLetter === '.' && status !== 'correct';

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
        }

        const totalAnimationTime = (wordLength - 1) * STAGGER_DELAY + FLIP_DURATION;

        setTimeout(() => {
            isAnimating = false;

            evaluations.forEach((evalData, b) => {
                if (!boardStates[b].solved) {
                    const isBoardWin = evalData.pattern.every(s => s === "correct");
                    if (isBoardWin) {
                        boardStates[b].solved = true;
                        boardStates[b].solvedAtAttempt = rowToAnimate;
                    }
                }
            });

            const allSolved = boardStates.every(b => b.solved);

            if (allSolved) {
                gameOver = true;
                gameEndState = {
                    type: 'win',
                    messageIndex: Math.floor(Math.random() * TRANSLATIONS[currentLang].winMessages.length)
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
                    targetWord: data.target_word || (data.target_words ? data.target_words.join(', ') : ''),
                    messageIndex: Math.floor(Math.random() * TRANSLATIONS[currentLang].loseMessages.length)
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
        messageIndex: Math.floor(Math.random() * TRANSLATIONS[currentLang].giveupMessages.length)
    };

    for (let b = 0; b < targetCount; b++) {
        const activeTile = getTileElement(b, currentAttempt, cursorIndex);
        if (activeTile) activeTile.classList.remove('active-cursor');
    }

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

    const infoBtn = document.getElementById('info-btn');
    if (infoBtn) infoBtn.disabled = true;
}

/** Updates keyboard key status colors based on status hierarchy. */
function updateKeyStatus(letter, newStatus) {
    // Exclude spaces, hyphens and any structurally given tiles from keyboard styling logic
    if (!letter || letter === ' ' || givenTiles.includes(letter)) return; 

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

/** Display temporary message string above board grid. */
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
    if (!msgEl) return;
    msgEl.innerText = '';

    if (messageTimeout) {
        clearTimeout(messageTimeout);
        messageTimeout = null;
    }
}

/** Grays out remaining un-evaluated tiles across all boards. */
function grayOutRemainingTiles() {
    for (let b = 0; b < targetCount; b++) {
        for (let r = 0; r < maxAttempts; r++) {
            for (let c = 0; c < wordLength; c++) {
                const tile = getTileElement(b, r, c);
                if (!tile) continue;

                tile.classList.remove('active-cursor');

                if (isGivenTile(b, c)) {
                    tile.className = "tile correct";
                    tile.innerText = targets[b][c];
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
}

initGame();