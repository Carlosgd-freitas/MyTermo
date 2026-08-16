import json
import random
from pathlib import Path
from config import GIVEN_TILES, MAX_ATTEMPTS, TARGET, TITLE
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
    "flame",
    "embers",
    "lava",
    "sunset",
    "sunny",
    "honey",
    "forest",
    "jungle",
    "mint",
    "deep-sea",
    "day",
    "night",
    "lavender",
    "royal",
    "cherry",
    "jam",
    "cloud",
    "midnight",
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
    """Return initial board dimensions, fixed tiles, victory messages, and target info."""
    target_norms = [normalize_string(w) for w in TARGET]
    first_target = target_norms[0] if target_norms else ""
    given_set = list(normalize_given_tiles(GIVEN_TILES))

    return {
        "title": TITLE,
        "length": len(first_target),
        "target_count": len(TARGET),
        "targets": target_norms,
        "max_attempts": MAX_ATTEMPTS,
        "given_tiles": given_set,
        "victory_messages": get_random_messages("victory"),
    }


@router.get("/api/themes")
def get_themes():
    """Return UI theme metadata dynamically loaded from the /themes directory."""
    return load_dynamic_themes()


@router.post("/api/guess")
def check_guess(request: GuessRequest):
    """Validate user guess and return tile evaluation patterns for all target words."""
    guess = request.word.upper()
    target_norms = [normalize_string(w) for w in TARGET]
    target_len = len(target_norms[0]) if target_norms else 0

    if len(guess) != target_len:
        return {"error": f"Word must be {target_len} letters long."}

    evaluations = []
    for w in TARGET:
        pattern, revealed_letters = evaluate_guess(guess, w)
        evaluations.append({
            "pattern": pattern,
            "revealed_letters": revealed_letters,
            "target_word": normalize_string(w),
        })

    messages = get_random_messages("victory", "fail")

    return {
        "guess": guess,
        "target_length": target_len,
        "pattern": evaluations[0]["pattern"],
        "revealed_letters": evaluations[0]["revealed_letters"],
        "target_word": evaluations[0]["target_word"],
        "evaluations": evaluations,
        "target_words": target_norms,
        "victory_messages": messages["victory"],
        "fail_messages": messages["fail"],
    }


@router.post("/api/hint")
def get_hint(request: HintRequest):
    """Generate a single unrevealed letter hint for active game targets."""
    target_norms = [normalize_string(w) for w in TARGET]
    primary_target = target_norms[0] if target_norms else ""
    given_set = normalize_given_tiles(GIVEN_TILES)
    target_len = len(primary_target)

    given_indices = {i for i, char in enumerate(primary_target) if char in given_set}
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
        for i, char in enumerate(primary_target)
    ]

    hint_word = "".join(hint_chars)

    evaluations = []
    for w in TARGET:
        pattern, revealed_letters = evaluate_guess(hint_word, w)
        evaluations.append({
            "pattern": pattern,
            "revealed_letters": revealed_letters,
            "target_word": normalize_string(w),
        })

    messages = get_random_messages("victory", "fail")

    return {
        "guess": hint_word,
        "target_length": target_len,
        "pattern": evaluations[0]["pattern"],
        "revealed_letters": evaluations[0]["revealed_letters"],
        "target_word": evaluations[0]["target_word"],
        "evaluations": evaluations,
        "target_words": target_norms,
        "victory_messages": messages["victory"],
        "fail_messages": messages["fail"],
        "hint_index": hint_idx,
    }


@router.post("/api/give-up")
def give_up():
    """End the game voluntarily and return all target words with a pity message."""
    target_norms = [normalize_string(w) for w in TARGET]
    return {
        "target_word": ", ".join(target_norms),
        "target_words": target_norms,
        "messages": get_random_messages("pity"),
    }
