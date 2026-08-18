# MyTermo
**MyTermo** is a self-hosted clone of the website game [Termo](https://term.ooo).

The objective of the game is to guess single or multiple *targets*, where each of these can be a word or a phrase. The player makes a guess, and if a *target*:
* Doesn't contain a character, it is displayed as gray;
* Contains a character, but the position is wrong, it is displayed as yellow;
* Contains a character, and the position is right, it is displayed as green.

The game ends if:
* The player correctly guesses all *targets*.
* The player runs out of tries.
* The player gives up and presses the corresponding button, revealing all *targets*.

# Setup
Before running **MyTermo** for the first time, some steps need to be done a single time:
1. Install `Python 3.13+`.
2. Install all required packages by executing `pip install -r requirements.txt`.

# Running the Game
1. Define the *targets* through `TARGET` at [`src/config.py`](src/config.py). Every *target* in this list **must** have the same character length.
Examples:
    * `TARGET = ["TERMO"]` -> Valid single *target*
    * `TARGET = ["MY", "TERMO"]` -> Invalid multiple *targets* 
    * `TARGET = ["BERRY", "JUICE"]` -> Valid multiple *targets*
2. Define the maximum number of attempts through `MAX_ATTEMPTS` at [`src/config.py`](src/config.py).
3. Define the characters given before each guess attempt through `GIVEN_TILES` at [`src/config.py`](src/config.py). Tiles containing given characters can't be overwritten by players. If the game has multiple *targets*, each *target* must have its given tiles in the same positions.
4. Define the subject hint settings:
   * The subject text can be defined through `SUBJECT` at [`src/config.py`](src/config.py). To disable it, set it to `None` (e.g. `SUBJECT = None`).
   * The subject image is defined as [`subject.jpg`](subject.jpg). To disable it, rename or delete that file.
5. Open the terminal at the project root and execute `uvicorn src.main:app --reload`. The application can be closed by pressing **CTRL+C** at the terminal or by closing the later.
6. In a browser, enter the address `http://localhost:8000`.

# Customization
1. Game and browser tab title can be defined through `TITLE` at [`src/config.py`](src/config.py).
2. All of the game languages and its elements are present at [`static/js/translations.js`](static/js/translations.js)
3. New and existing themes can be added directly or edited at the `/themes` directory.
4. Browser tab favicon can be changed through `favicon.ico`.

# Extended Setup
1. Follow the steps for **Setup**
2. Install `npm`.
3. Install `playwright`.
4. To use the configured code linting and formatting packages on commits, execute `pre-commit install`.

# Automated Testing
1. Follow the steps for **Extended Setup**
2. In one terminal, run the application in a browser.
3. In another terminal, execute `pytest` at the project root.
