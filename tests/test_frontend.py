import pytest
import re
from playwright.sync_api import Page, expect

# Playwright requires the server to be running locally for E2E tests,
# or you can configure a live-server fixture in conftest.py.
BASE_URL = "http://127.0.0.1:8000"


@pytest.fixture(autouse=True)
def load_game(page: Page):
    """Context setup: Automatically load the game URL before every test."""
    page.goto(BASE_URL)

    # CRITICAL FIX: Wait for the virtual keyboard to render.
    # This guarantees the JavaScript has fully hydrated the application
    # and attached the 'keydown' event listeners before we start typing.
    page.locator(".key").first.wait_for(state="visible")

    yield page


class TestInitialization:
    """Context: Application bootstrap and initial state."""

    def test_page_loads_and_has_title(self, page: Page):
        # Check HTML/JS initialization
        title = page.locator("#game-title")
        expect(title).to_have_text("MyTermo")

    def test_initial_board_is_empty(self, page: Page):
        # Ensure tiles start empty and without state classes
        first_tile = page.locator(".tile").first
        expect(first_tile).to_be_empty()
        expect(first_tile).not_to_have_class(
            re.compile(r"filled|correct|present|absent")
        )


class TestInputMechanics:
    """Context: Virtual and physical keyboard inputs."""

    def test_virtual_keyboard_interaction(self, page: Page):
        # Simulate a user clicking the 'A' key on your virtual keyboard
        page.locator(".key", has_text="A").click()

        # Verify the JS updated the board's CSS correctly
        first_tile = page.locator(".tile").first
        expect(first_tile).to_have_text("A", ignore_case=True)
        expect(first_tile).to_have_class(re.compile(r"filled"))

    def test_physical_keyboard_interaction(self, page: Page):
        # Click the body to guarantee the window has keyboard focus
        page.locator("body").click()

        # Press lowercase 'b' (avoids Playwright simulating a Shift key modifier)
        page.keyboard.press("b")

        # The game usually renders text in uppercase, so we ignore case in the assertion
        first_tile = page.locator(".tile").first
        expect(first_tile).to_have_text("B", ignore_case=True)
        expect(first_tile).to_have_class(re.compile(r"filled"))

    def test_backspace_removes_letter(self, page: Page):
        page.locator("body").click()

        # Type a lowercase letter then remove it
        page.keyboard.press("c")
        page.keyboard.press("Backspace")

        first_tile = page.locator(".tile").first
        expect(first_tile).to_be_empty()
        expect(first_tile).not_to_have_class(re.compile(r"filled"))


class TestGameLogic:
    """Context: Word submission and game rules."""

    def test_cannot_submit_incomplete_word(self, page: Page):
        # Type a word shorter than the required length (assuming 5 letters)
        for letter in ["c", "a", "t"]:
            page.keyboard.press(letter)

        page.keyboard.press("Enter")

        # Verify the row did not process (tiles shouldn't have result classes)
        first_tile = page.locator(".tile").first
        expect(first_tile).not_to_have_class(re.compile(r"correct|present|absent"))

    def test_typing_stops_at_row_limit(self, page: Page):
        # Attempt to type more than 5 letters
        for letter in ["p", "l", "a", "n", "e", "t", "s"]:
            page.keyboard.press(letter)

        # The 6th tile (index 5) should remain empty if logic restricts to 5 letters per row
        sixth_tile = page.locator(".tile").nth(5)
        expect(sixth_tile).to_be_empty()
