from src.game.logic import normalize_string, normalize_given_tiles, evaluate_guess


def test_normalize_string():
    """Verify that accents are stripped and text is capitalized[cite: 16]."""
    assert normalize_string("Açaí") == "ACAI"
    assert normalize_string("hello-world") == "HELLO-WORLD"
    assert normalize_string("JALAPEÑO") == "JALAPENO"


def test_normalize_given_tiles():
    """Verify that given tiles are properly converted into a normalized set[cite: 16]."""
    result = normalize_given_tiles(["-", "ã", "C"])
    assert result == {"-", "A", "C"}


def test_evaluate_guess_exact_match():
    """Verify that a perfect guess returns all 'correct'[cite: 16]."""
    pattern, revealed = evaluate_guess("APPLE", "APPLE", [])
    assert pattern == ["correct", "correct", "correct", "correct", "correct"]
    assert revealed == ["A", "P", "P", "L", "E"]


def test_evaluate_guess_mixed_match():
    """Verify Wordle-style logic for present and absent letters[cite: 16]."""
    # Target: APPLE. Guess: PAPER.
    # P(2nd letter in PAPER) is in the wrong spot -> present
    # A is in the wrong spot -> present
    # P(3rd letter in PAPER) is exact match -> correct
    # E is in the wrong spot -> present
    # R is not in APPLE -> absent
    pattern, revealed = evaluate_guess("PAPER", "APPLE", [])
    assert pattern == ["present", "present", "correct", "present", "absent"]
    assert revealed == ["P", "A", "P", "E", "R"]


def test_evaluate_guess_with_given_tiles():
    """Verify that given tiles are automatically marked as 'correct'[cite: 16]."""
    # Even if the guess is entirely wrong, the given tile index should remain correct
    pattern, revealed = evaluate_guess("ABC-D", "XYZ-W", ["-"])

    assert pattern[3] == "correct"  # The hyphen index is 3
    assert pattern[0] == "absent"
