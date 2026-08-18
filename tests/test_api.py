from fastapi.testclient import TestClient
from unittest.mock import patch

# Assuming your FastAPI app instance is defined in src.main
from src.main import app

client = TestClient(app)


@patch("src.api.routes.TARGET", ["APPLE"])
@patch("src.api.routes.TITLE", "Test Game")
def test_get_config():
    """Test that the config endpoint returns the correct structure and lengths[cite: 15]."""
    response = client.get("/api/config")
    assert response.status_code == 200

    data = response.json()
    assert data["title"] == "Test Game"
    assert data["length"] == 5
    assert data["targets"] == ["APPLE"]


@patch("src.api.routes.TARGET", ["APPLE"])
def test_check_guess_valid():
    """Test submitting a valid length guess to the API[cite: 15]."""
    response = client.post("/api/guess", json={"word": "APPLE"})
    assert response.status_code == 200

    data = response.json()
    assert data["guess"] == "APPLE"
    assert data["target_length"] == 5
    assert data["pattern"] == ["correct", "correct", "correct", "correct", "correct"]


@patch("src.api.routes.TARGET", ["APPLE"])
def test_check_guess_invalid_length():
    """Test that submitting a guess of the wrong length returns an error[cite: 15]."""
    response = client.post("/api/guess", json={"word": "APP"})
    assert response.status_code == 200

    data = response.json()
    assert "error" in data
    assert data["error"] == "Word must be 5 letters long."


@patch("src.api.routes.TARGET", ["APPLE"])
@patch("src.api.routes.GIVEN_TILES", [])
def test_get_hint():
    """Test that the hint endpoint returns a valid index for an unrevealed letter[cite: 15]."""
    response = client.post("/api/hint", json={"revealed_indices": [], "board_index": 0})

    assert response.status_code == 200
    data = response.json()

    assert "hint_index" in data
    assert 0 <= data["hint_index"] < 5
    assert data["target_length"] == 5

    # A hint should result in at least one 'correct' evaluation in the pattern[cite: 15]
    assert "correct" in data["pattern"]


@patch("src.api.routes.TARGET", ["APPLE"])
def test_give_up():
    """Test that giving up returns the normalized target words[cite: 15]."""
    response = client.post("/api/give-up")
    assert response.status_code == 200

    data = response.json()
    assert data["target_word"] == "APPLE"
    assert data["target_words"] == ["APPLE"]


def test_get_themes():
    """Test that the themes endpoint successfully loads and returns a list[cite: 15]."""
    response = client.get("/api/themes")
    assert response.status_code == 200
    assert isinstance(response.json(), list)
