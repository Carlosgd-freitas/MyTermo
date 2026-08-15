import random
from pathlib import Path
from config import MAX_ATTEMPTS, TARGET_WORD, TITLE
from fastapi import APIRouter
from fastapi.responses import FileResponse
from game_logic import (
    evaluate_guess,
    get_random_endgame_messages,
    get_random_pity_message,
)
from pydantic import BaseModel

router = APIRouter()
FAVICON_PATH = Path(__file__).parent / "favicon.ico"


class GuessRequest(BaseModel):
    word: str


class HintRequest(BaseModel):
    revealed_indices: list[int] = []


@router.get("/favicon.ico", include_in_schema=False)
async def favicon():
    if FAVICON_PATH.exists():
        return FileResponse(FAVICON_PATH, media_type="image/x-icon")
    return ("Favicon not found", 404)


@router.get("/api/config")
def get_config():
    return {
        "title": TITLE,
        "length": len(TARGET_WORD),
        "max_attempts": MAX_ATTEMPTS,
        "space_indices": [
            i for i, char in enumerate(TARGET_WORD) if char == " "
        ],
        "hyphen_indices": [
            i for i, char in enumerate(TARGET_WORD) if char == "-"
        ],
    }


@router.post("/api/guess")
def check_guess(request: GuessRequest):
    guess = request.word.upper()
    target_len = len(TARGET_WORD)

    if len(guess) != target_len:
        return {"error": f"Word must be {target_len} letters long."}

    pattern, revealed_letters = evaluate_guess(guess, TARGET_WORD)
    endgame_msgs = get_random_endgame_messages()

    return {
        "guess": guess,
        "target_length": target_len,
        "pattern": pattern,
        "revealed_letters": revealed_letters,
        "target_word": TARGET_WORD,
        "victory_messages": endgame_msgs["victory"],
        "fail_messages": endgame_msgs["fail"],
    }


@router.post("/api/hint")
def get_hint(request: HintRequest):
    target_len = len(TARGET_WORD)
    fixed_indices = {i for i, char in enumerate(TARGET_WORD) if char in (" ", "-")}

    # Filter out spaces, hyphens, and already revealed positions
    unrevealed = [
        i
        for i in range(target_len)
        if i not in fixed_indices and i not in request.revealed_indices
    ]

    if not unrevealed:
        return {"error": "NO_HINTS_AVAILABLE"}

    # Randomly pick one unrevealed correct letter index
    hint_idx = random.choice(unrevealed)

    # Build hint word with '.' for unrevealed letter positions
    hint_chars = []
    for i, char in enumerate(TARGET_WORD):
        if char == " ":
            hint_chars.append(" ")
        elif char == "-":
            hint_chars.append("-")
        elif i == hint_idx or i in request.revealed_indices:
            hint_chars.append(char)
        else:
            hint_chars.append(".")

    hint_word = "".join(hint_chars)
    pattern, revealed_letters = evaluate_guess(hint_word, TARGET_WORD)
    endgame_msgs = get_random_endgame_messages()

    return {
        "guess": hint_word,
        "target_length": target_len,
        "pattern": pattern,
        "revealed_letters": revealed_letters,
        "target_word": TARGET_WORD,
        "victory_messages": endgame_msgs["victory"],
        "fail_messages": endgame_msgs["fail"],
        "hint_index": hint_idx,
    }


@router.post("/api/give-up")
def give_up():
    return {
        "target_word": TARGET_WORD,
        "messages": get_random_pity_message(),
    }
