import json
import random
from pathlib import Path
from config import GIVEN_TILES, MAX_ATTEMPTS, TARGET_WORD, TITLE
from fastapi import APIRouter
from fastapi.responses import FileResponse
from game_logic import (
    evaluate_guess,
    get_random_messages,
    normalize_given_tiles,
    normalize_string,
)
from pydantic import BaseModel

router = APIRouter()
FAVICON_PATH = Path(__file__).parent / "favicon.ico"
THEMES_DIR = Path(__file__).parent / "themes"

PREFERRED_THEME_ORDER = [
    "classic",
    "dark",
    "day",
    "night",
    "sunset",
    "embers",
    "forest",
    "jungle",
    "cherry",
    "royal",
]


def load_dynamic_themes():
    """Scan the themes directory and parse metadata and colors from JSON theme files."""
    themes_path = THEMES_DIR if THEMES_DIR.exists() else Path("themes")
    themes = []

    if themes_path.exists():
        for file_path in themes_path.glob("*.json"):
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    themes.append(json.load(f))
            except Exception:
                continue

    def theme_sort_key(theme):
        theme_id = theme.get("id", "")
        if theme_id in PREFERRED_THEME_ORDER:
            return (0, PREFERRED_THEME_ORDER.index(theme_id))
        return (1, theme_id)

    themes.sort(key=theme_sort_key)
    return themes


class GuessRequest(BaseModel):
    word: str


class HintRequest(BaseModel):
    revealed_indices: list[int] = []


@router.get("/favicon.ico", include_in_schema=False)
async def favicon():
    """Serve the application favicon if present."""
    if FAVICON_PATH.exists():
        return FileResponse(FAVICON_PATH, media_type="image/x-icon")
    return ("Favicon not found", 404)


@router.get("/api/config")
def get_config():
    """Return initial board dimensions, fixed tiles, and victory messages."""
    target_norm = normalize_string(TARGET_WORD)
    given_set = normalize_given_tiles(GIVEN_TILES)

    given_map = {
        i: char for i, char in enumerate(target_norm) if char in given_set
    }

    return {
        "title": TITLE,
        "length": len(target_norm),
        "max_attempts": MAX_ATTEMPTS,
        "given_tiles": given_map,
        "victory_messages": get_random_messages("victory"),
    }


@router.get("/api/themes")
def get_themes():
    """Return UI theme metadata dynamically loaded from the /themes directory."""
    return load_dynamic_themes()


@router.post("/api/guess")
def check_guess(request: GuessRequest):
    """Validate user guess and return tile evaluation patterns."""
    guess = request.word.upper()
    target_norm = normalize_string(TARGET_WORD)
    target_len = len(target_norm)

    if len(guess) != target_len:
        return {"error": f"Word must be {target_len} letters long."}

    pattern, revealed_letters = evaluate_guess(guess, TARGET_WORD)
    messages = get_random_messages("victory", "fail")

    return {
        "guess": guess,
        "target_length": target_len,
        "pattern": pattern,
        "revealed_letters": revealed_letters,
        "target_word": target_norm,
        "victory_messages": messages["victory"],
        "fail_messages": messages["fail"],
    }


@router.post("/api/hint")
def get_hint(request: HintRequest):
    """Generate a single unrevealed letter hint for the active game."""
    target_norm = normalize_string(TARGET_WORD)
    given_set = normalize_given_tiles(GIVEN_TILES)
    target_len = len(target_norm)

    given_indices = {i for i, char in enumerate(target_norm) if char in given_set}
    unrevealed = [
        i
        for i in range(target_len)
        if i not in given_indices and i not in request.revealed_indices
    ]

    if not unrevealed:
        return {"error": "NO_HINTS_AVAILABLE"}

    hint_idx = random.choice(unrevealed)
    hint_chars = [
        char if (char in given_set or i == hint_idx or i in request.revealed_indices) else "."
        for i, char in enumerate(target_norm)
    ]

    hint_word = "".join(hint_chars)
    pattern, revealed_letters = evaluate_guess(hint_word, TARGET_WORD)
    messages = get_random_messages("victory", "fail")

    return {
        "guess": hint_word,
        "target_length": target_len,
        "pattern": pattern,
        "revealed_letters": revealed_letters,
        "target_word": target_norm,
        "victory_messages": messages["victory"],
        "fail_messages": messages["fail"],
        "hint_index": hint_idx,
    }


@router.post("/api/give-up")
def give_up():
    """End the game voluntarily and return the target word with a pity message."""
    return {
        "target_word": normalize_string(TARGET_WORD),
        "messages": get_random_messages("pity"),
    }
