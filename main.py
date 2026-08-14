from collections import Counter
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

app = FastAPI()

# Renamed target to SECRET_WORD
TARGET_WORD  = "TERMO"
MAX_ATTEMPTS = 6


class GuessRequest(BaseModel):
    word: str


@app.get("/api/config")
def get_config():
    """Returns game rules so the frontend can build the grid dynamically."""
    return {"length": len(TARGET_WORD), "max_attempts": MAX_ATTEMPTS}


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

    return {
        "guess": guess,
        "secret_length": target_len,
        "pattern": pattern,
    }


app.mount("/", StaticFiles(directory="static", html=True), name="static")
