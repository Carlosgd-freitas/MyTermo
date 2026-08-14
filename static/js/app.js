const TRANSLATIONS = {
    en: {
        giveUp: "Give Up",
        mustFill: (len) => `Fill all ${len} letters!`,
        wordWas: "The word was:"
    },
    pt: {
        giveUp: "Desistir",
        mustFill: (len) => `Preencha todas as ${len} letras!`,
        wordWas: "A palavra era:"
    }
};

let currentLang = localStorage.getItem('termo_lang') || 'en';

let wordLength = 5;
let maxAttempts = 6;
let currentAttempt = 0;

let currentGuess = [];
let cursorIndex = 0;
let gameOver = false;
let gameEndState = null;

const letterStatuses = {};

const KEYBOARD_LAYOUT = [
    ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
    ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
    ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "DEL"]
];

const STATUS_PRIORITY = { "correct": 3, "present": 2, "absent": 1 };

async function initGame() {
    const res = await fetch('/api/config');
    const config = await res.json();
    
    document.title = config.title;
    document.getElementById('game-title').innerText = config.title;

    wordLength = config.length;
    maxAttempts = config.max_attempts;

    currentGuess = Array(wordLength).fill("");
    cursorIndex = 0;

    document.documentElement.style.setProperty('--word-length', wordLength);

    updateLangToggleUI();
    updateUITexts();
    buildGrid();
    buildKeyboard();
    updateCurrentRow();

    document.addEventListener('keydown', handlePhysicalKeyboard);
}

function changeLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('termo_lang', lang);
    updateLangToggleUI();
    updateUITexts();
}

function updateLangToggleUI() {
    document.querySelectorAll('.lang-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.getElementById(`lang-${currentLang}`);
    if (activeBtn) activeBtn.classList.add('active');
}

function updateUITexts() {
    const btn = document.getElementById('giveup-btn');
    if (btn) btn.innerText = TRANSLATIONS[currentLang].giveUp;

    if (gameEndState) {
        const text = gameEndState.messages[currentLang];
        const wordWasLabel = TRANSLATIONS[currentLang].wordWas;

        if (gameEndState.type === 'win') {
            showMessage(text);
        } else if (gameEndState.type === 'lose' || gameEndState.type === 'giveup') {
            showMessage(`${text} ${wordWasLabel} ${gameEndState.targetWord}`);
        }
    }
}

function buildGrid() {
    const grid = document.getElementById('grid');
    grid.innerHTML = '';

    for (let r = 0; r < maxAttempts; r++) {
        const row = document.createElement('div');
        row.className = 'row';

        for (let c = 0; c < wordLength; c++) {
            const tile = document.createElement('div');
            tile.className = 'tile';
            tile.id = `tile-${r}-${c}`;

            tile.addEventListener('click', () => {
                if (!gameOver && r === currentAttempt) {
                    cursorIndex = c;
                    updateCurrentRow();
                }
            });

            row.appendChild(tile);
        }
        grid.appendChild(row);
    }
}

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
            }

            button.addEventListener('click', () => {
                if (!gameOver) processInput(keyText);
            });

            row.appendChild(button);
        });

        keyboard.appendChild(row);
    });
}

function handlePhysicalKeyboard(e) {
    if (gameOver) return;

    if (e.key === 'Enter') {
        processInput('ENTER');
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
        processInput('DEL');
    } else if (e.key === 'ArrowLeft') {
        cursorIndex = Math.max(0, cursorIndex - 1);
        updateCurrentRow();
    } else if (e.key === 'ArrowRight') {
        cursorIndex = Math.min(wordLength - 1, cursorIndex + 1);
        updateCurrentRow();
    } else if (/^[a-zA-Z]$/.test(e.key)) {
        processInput(e.key.toUpperCase());
    }
}

function processInput(key) {
    if (key === 'ENTER') {
        submitGuess();
    } else if (key === 'DEL') {
        if (currentGuess[cursorIndex] !== "") {
            currentGuess[cursorIndex] = "";
        } else if (cursorIndex > 0) {
            cursorIndex--;
            currentGuess[cursorIndex] = "";
        }
        updateCurrentRow();
    } else if (/^[A-Z]$/.test(key)) {
        currentGuess[cursorIndex] = key;

        if (cursorIndex < wordLength - 1) {
            cursorIndex++;
        }

        updateCurrentRow();
    }
}

function updateCurrentRow() {
    for (let c = 0; c < wordLength; c++) {
        const tile = document.getElementById(`tile-${currentAttempt}-${c}`);
        if (!tile) continue;

        const letter = currentGuess[c] || "";
        tile.innerText = letter;

        tile.classList.remove('active-cursor', 'filled');

        if (letter) {
            tile.classList.add('filled');
        }

        if (c === cursorIndex && !gameOver) {
            tile.classList.add('active-cursor');
        }
    }
}

async function submitGuess() {
    if (currentGuess.some(char => char === "")) {
        showMessage(TRANSLATIONS[currentLang].mustFill(wordLength));
        return;
    }

    const wordToSubmit = currentGuess.join("");

    const response = await fetch('/api/guess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word: wordToSubmit })
    });

    const data = await response.json();

    if (data.error) {
        showMessage(data.error);
        return;
    }

    const currentCursorTile = document.getElementById(`tile-${currentAttempt}-${cursorIndex}`);
    if (currentCursorTile) currentCursorTile.classList.remove('active-cursor');

    for (let i = 0; i < wordLength; i++) {
        const letter = wordToSubmit[i];
        const status = data.pattern[i];

        const tile = document.getElementById(`tile-${currentAttempt}-${i}`);
        tile.classList.add(status);

        updateKeyStatus(letter, status);
    }

    if (data.pattern.every(s => s === "correct")) {
        gameOver = true;
        gameEndState = {
            type: 'win',
            messages: data.victory_messages
        };
        updateUITexts();
        disableGiveUpBtn();
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
        updateUITexts();
        disableGiveUpBtn();
    } else {
        currentGuess = Array(wordLength).fill("");
        cursorIndex = 0;
        updateCurrentRow();
    }
}

async function giveUp() {
    if (gameOver) return;

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

    updateUITexts();
    disableGiveUpBtn();
}

function disableGiveUpBtn() {
    const btn = document.getElementById('giveup-btn');
    if (btn) btn.disabled = true;
}

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

function showMessage(text) {
    const msgEl = document.getElementById('message');
    msgEl.innerText = text;
    if (!gameOver) {
        setTimeout(() => { if (!gameOver) msgEl.innerText = ''; }, 3000);
    }
}

// Start game on page load
initGame();