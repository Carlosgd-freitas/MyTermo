"""Core game evaluation and text normalization logic."""

import unicodedata
from typing import Optional
from config import GIVEN_TILES


def normalize_string(text: str) -> str:
    """Strip accents and diacritics from text while preserving hyphens and spaces."""
    nfkd = unicodedata.normalize("NFD", text)
    cleaned = "".join([c for c in nfkd if not unicodedata.combining(c)])
    return cleaned.upper()


def normalize_given_tiles(given_tiles: Optional[list[str]] = None) -> set[str]:
    """Convert given tiles into a normalized set of characters.

    Args:
        given_tiles (Optional[list[str]]): List of characters to normalize.
            Defaults to GIVEN_TILES from config.

    Returns:
        set[str]: Unique normalized given tile characters.
    """
    tiles = GIVEN_TILES if given_tiles is None else given_tiles
    return {normalize_string(t) for t in tiles}


def evaluate_guess(
    guess: str, target_word: str, given_tiles: Optional[list[str]] = None
) -> tuple[list[str], list[str]]:
    """Evaluate a guess against a target word following standard Wordle rules.

    Args:
        guess (str): User attempt word.
        target_word (str): Target secret word.
        given_tiles (Optional[list[str]]): Characters ignored for strict comparison.

    Returns:
        tuple[list[str], list[str]]:
            - pattern: List of statuses ('correct', 'present', 'absent').
            - revealed_letters: List of uppercase normalized characters evaluated.
    """
    given_set = normalize_given_tiles(given_tiles)
    guess_norm = normalize_string(guess)
    target_norm = normalize_string(target_word)

    n = len(target_norm)
    pattern = ["absent"] * n
    target_counts = {}

    # Pass 1: Mark exact matches and free given tiles
    for i in range(n):
        if target_norm[i] in given_set:
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
