from collections import Counter
from pathlib import Path
import random
from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

app = FastAPI()

TITLE = "MYTERMO"
TARGET_WORD = "TERMO"
MAX_ATTEMPTS = 6

FAVICON_PATH = Path(__file__).parent / "favicon.ico"

VICTORY_MESSAGES = {
    "en": [
        "Sensational! You guessed it!",
        "Genius level! You nailed the word!",
        "Mind blown! Spot on!",
        "Masterpiece! You solved it like a pro!",
    ],
    "pt": [
        "Sensacional! Você acertou!",
        "Nível gênio! Você cravou a palavra!",
        "Impressionante! Na mosca!",
        "Obra-prima! Resolveu como um profissional!",
    ],
}

FAIL_MESSAGES = {
    "en": [
        "Game over! You ran out of attempts.",
        "Better luck next time! The word got the best of you.",
        "So close, yet so far! Out of tries.",
        "Tough luck! The word was victorious today.",
    ],
    "pt": [
        "Fim de jogo! Suas tentativas acabaram.",
        "Mais sorte na próxima! A palavra levou a melhor.",
        "Tão perto, mas tão longe! Fim das tentativas.",
        "Que azar! A palavra venceu hoje.",
    ],
}

PITY_MESSAGES = {
    "en": [
        "Bummer! Even the dictionary needed a coffee break after that.",
        "Don't worry, words can be tricky sometimes!",
        "So close! (Or maybe not that close...)",
        "Giving up is a strategic decision! Ready for another round?",
    ],
    "pt": [
        "Que pena! Até o dicionário precisou de um café depois dessa.",
        "Não se preocupupe, as palavras são cheias de pegadinhas!",
        "Foi quase! (Ou talvez não tão quase assim...)",
        "Desistir também é uma decisão estratégica! Próxima rodada?",
    ],
}


class GuessRequest(BaseModel):
    word: str


@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    if FAVICON_PATH.exists():
        return FileResponse(FAVICON_PATH, media_type="image/x-icon")
    return ("Favicon not found", 404)


@app.get("/api/config")
def get_config():
    return {
        "title": TITLE,
        "length": len(TARGET_WORD),
        "max_attempts": MAX_ATTEMPTS,
    }


@app.post("/api/guess")
def check_guess(request: GuessRequest):
    guess = request.word.upper()
    target = TARGET_WORD.upper()
    target_len = len(target)

    if len(guess) != target_len:
        return {"error": f"Word must be {target_len} letters long."}

    pattern = ["absent"] * target_len
    target_counts = Counter(target)

    # Pass 1: GREENS
    for i in range(target_len):
        if guess[i] == target[i]:
            pattern[i] = "correct"
            target_counts[guess[i]] -= 1

    # Pass 2: YELLOWS
    for i in range(target_len):
        if pattern[i] != "correct":
            char = guess[i]
            if target_counts.get(char, 0) > 0:
                pattern[i] = "present"
                target_counts[char] -= 1

    # Pick random indices for endgame potential messages
    v_idx = random.randint(0, len(VICTORY_MESSAGES["en"]) - 1)
    f_idx = random.randint(0, len(FAIL_MESSAGES["en"]) - 1)

    return {
        "guess": guess,
        "target_length": target_len,
        "pattern": pattern,
        "target_word": TARGET_WORD,
        "victory_messages": {
            "en": VICTORY_MESSAGES["en"][v_idx],
            "pt": VICTORY_MESSAGES["pt"][v_idx],
        },
        "fail_messages": {
            "en": FAIL_MESSAGES["en"][f_idx],
            "pt": FAIL_MESSAGES["pt"][f_idx],
        },
    }


@app.post("/api/give-up")
def give_up():
    idx = random.randint(0, len(PITY_MESSAGES["en"]) - 1)
    return {
        "target_word": TARGET_WORD,
        "messages": {
            "en": PITY_MESSAGES["en"][idx],
            "pt": PITY_MESSAGES["pt"][idx],
        },
    }


app.mount("/", StaticFiles(directory="static", html=True), name="static")
