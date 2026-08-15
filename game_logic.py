import random
import unicodedata
from messages import FAIL_MESSAGES, GIVE_UP_MESSAGES, VICTORY_MESSAGES


def normalize_string(text: str) -> str:
    """Normalizes accents while preserving hyphens and spaces."""
    nfkd = unicodedata.normalize('NFD', text)
    cleaned = "".join([c for c in nfkd if not unicodedata.combining(c)])
    return cleaned.upper().strip()


def get_random_endgame_messages() -> dict:
    """Returns localized victory and fail message dictionaries for routes.py."""
    return {
        "victory": {
            "en": random.choice(VICTORY_MESSAGES["en"]),
            "pt": random.choice(VICTORY_MESSAGES["pt"]),
        },
        "fail": {
            "en": random.choice(FAIL_MESSAGES["en"]),
            "pt": random.choice(FAIL_MESSAGES["pt"]),
        },
    }


def get_random_pity_message() -> dict:
    """Returns a localized give up message dictionary for routes.py."""
    return {
        "en": random.choice(GIVE_UP_MESSAGES["en"]),
        "pt": random.choice(GIVE_UP_MESSAGES["pt"]),
    }


def evaluate_guess(guess: str, target_word: str) -> tuple[list[str], list[str]]:
    """
    Evaluates guess against target_word.
    Returns a tuple: (pattern_list, revealed_letters_list).
    """
    guess_norm = normalize_string(guess)
    target_norm = normalize_string(target_word)

    n = len(target_norm)
    pattern = ["absent"] * n
    target_counts = {}

    # Pass 1: Mark exact matches, fixed spaces, and fixed hyphens
    for i in range(n):
        if target_norm[i] in [' ', '-']:
            pattern[i] = "correct"
        elif i < len(guess_norm) and guess_norm[i] == target_norm[i]:
            pattern[i] = "correct"
        else:
            target_counts[target_norm[i]] = target_counts.get(target_norm[i], 0) + 1

    # Pass 2: Mark present matches
    for i in range(n):
        if pattern[i] == "correct":
            continue
        
        if i < len(guess_norm):
            char = guess_norm[i]
            if target_counts.get(char, 0) > 0:
                pattern[i] = "present"
                target_counts[char] -= 1

    return pattern, list(guess_norm)
