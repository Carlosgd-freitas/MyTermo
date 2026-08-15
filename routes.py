import random
from pathlib import Path
from config import GIVEN_TILES, MAX_ATTEMPTS, TARGET_WORD, TITLE
from fastapi import APIRouter
from fastapi.responses import FileResponse
from game_logic import (
    evaluate_guess,
    get_random_endgame_messages,
    get_random_pity_message,
    normalize_given_tiles,
    normalize_string,
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
    target_norm = normalize_string(TARGET_WORD)
    given_set = normalize_given_tiles(GIVEN_TILES)

    # Map indices of normalized TARGET_WORD matching normalized GIVEN_TILES
    given_map = {
        i: char for i, char in enumerate(target_norm) if char in given_set
    }
    endgame_msgs = get_random_endgame_messages()

    return {
        "title": TITLE,
        "length": len(target_norm),
        "max_attempts": MAX_ATTEMPTS,
        "given_tiles": given_map,
        "victory_messages": endgame_msgs["victory"],
    }


@router.post("/api/guess")
def check_guess(request: GuessRequest):
    guess = request.word.upper()
    target_norm = normalize_string(TARGET_WORD)
    target_len = len(target_norm)

    if len(guess) != target_len:
        return {"error": f"Word must be {target_len} letters long."}

    pattern, revealed_letters = evaluate_guess(guess, TARGET_WORD)
    endgame_msgs = get_random_endgame_messages()

    return {
        "guess": guess,
        "target_length": target_len,
        "pattern": pattern,
        "revealed_letters": revealed_letters,
        "target_word": target_norm,
        "victory_messages": endgame_msgs["victory"],
        "fail_messages": endgame_msgs["fail"],
    }


@router.post("/api/hint")
def get_hint(request: HintRequest):
    target_norm = normalize_string(TARGET_WORD)
    given_set = normalize_given_tiles(GIVEN_TILES)
    target_len = len(target_norm)

    given_indices = {i for i, char in enumerate(target_norm) if char in given_set}

    # Filter out given indices and already revealed positions
    unrevealed = [
        i
        for i in range(target_len)
        if i not in given_indices and i not in request.revealed_indices
    ]

    if not unrevealed:
        return {"error": "NO_HINTS_AVAILABLE"}

    # Randomly pick one unrevealed correct letter index
    hint_idx = random.choice(unrevealed)

    # Build hint word with '.' for unrevealed letter positions
    hint_chars = []
    for i, char in enumerate(target_norm):
        if char in given_set or i == hint_idx or i in request.revealed_indices:
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
        "target_word": target_norm,
        "victory_messages": endgame_msgs["victory"],
        "fail_messages": endgame_msgs["fail"],
        "hint_index": hint_idx,
    }


@router.post("/api/give-up")
def give_up():
    return {
        "target_word": normalize_string(TARGET_WORD),
        "messages": get_random_pity_message(),
    }
