from collections import Counter
import random
from messages import FAIL_MESSAGES, GIVE_UP_MESSAGES, VICTORY_MESSAGES


def evaluate_guess(guess: str, target: str) -> list[str]:
    """Evaluates guess against target and returns pattern list ('correct', 'present', 'absent')."""
    guess_upper = guess.upper()
    target_upper = target.upper()
    target_len = len(target_upper)

    pattern = ["absent"] * target_len
    target_counts = Counter(target_upper)

    # Pass 1: Correct letters (Green)
    for i in range(target_len):
        if guess_upper[i] == target_upper[i]:
            pattern[i] = "correct"
            target_counts[guess_upper[i]] -= 1

    # Pass 2: Present letters (Yellow)
    for i in range(target_len):
        if pattern[i] != "correct":
            char = guess_upper[i]
            if target_counts.get(char, 0) > 0:
                pattern[i] = "present"
                target_counts[char] -= 1

    return pattern


def get_random_endgame_messages():
    """Selects a random corresponding victory and fail message for both languages."""
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
    """Selects a random pity message for both languages."""
    p_idx = random.randint(0, len(GIVE_UP_MESSAGES["en"]) - 1)
    return {
        "en": GIVE_UP_MESSAGES["en"][p_idx],
        "pt": GIVE_UP_MESSAGES["pt"][p_idx],
    }
