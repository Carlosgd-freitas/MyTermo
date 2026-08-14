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


@router.post("/api/give-up")
def give_up():
    return {
        "target_word": TARGET_WORD,
        "messages": get_random_pity_message(),
    }
