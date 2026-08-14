from collections import Counter
import random
import unicodedata
from messages import FAIL_MESSAGES, GIVE_UP_MESSAGES, VICTORY_MESSAGES


def strip_accents(text: str) -> str:
    """Removes diacritics/accents from a string (e.g. 'TERÇO' -> 'TERCO', 'SÁBIO' -> 'SABIO')."""
    return "".join(
        c
        for c in unicodedata.normalize("NFD", text)
        if unicodedata.category(c) != "Mn"
    )


def evaluate_guess(guess: str, target: str) -> tuple[list[str], list[str]]:
    """Evaluates guess against target ignoring accents for matching,

    and returns (pattern_list, revealed_letters_list).
    """
    guess_upper = guess.upper()
    target_upper = target.upper()

    guess_norm = strip_accents(guess_upper)
    target_norm = strip_accents(target_upper)

    target_len = len(target_norm)
    pattern = ["absent"] * target_len
    revealed_letters = list(guess_upper)

    target_counts = Counter(target_norm)

    # Pass 1: Correct letters (Green)
    for i in range(target_len):
        if guess_norm[i] == target_norm[i]:
            pattern[i] = "correct"
            revealed_letters[i] = target_upper[
                i
            ]  # Reveal actual accented character ('Ç', 'Á', etc.)
            target_counts[guess_norm[i]] -= 1

    # Pass 2: Present letters (Yellow)
    for i in range(target_len):
        if pattern[i] != "correct":
            char = guess_norm[i]
            if target_counts.get(char, 0) > 0:
                pattern[i] = "present"
                target_counts[char] -= 1

    return pattern, revealed_letters


def get_random_endgame_messages():
    v_idx = random.randint(0, len(VICTORY_MESSAGES["en"]) - 1)
    f_idx = random.randint(0, len(FAIL_MESSAGES["en"]) - 1)

    return {
        "victory": {
            "en": VICTORY_MESSAGES["en"][v_idx],
            "pt": VICTORY_MESSAGES["pt"][v_idx],
        },
        "fail": {
            "en": FAIL_MESSAGES["en"][f_idx],
            "pt": FAIL_MESSAGES["pt"][f_idx],
        },
    }


def get_random_pity_message():
    p_idx = random.randint(0, len(GIVE_UP_MESSAGES["en"]) - 1)
    return {
        "en": GIVE_UP_MESSAGES["en"][p_idx],
        "pt": GIVE_UP_MESSAGES["pt"][p_idx],
    }
