# MyTermo
**MyTermo** is a clone of the website game [Termo](https://term.ooo).

The objective of the game is to guess a determined, secret *target word*. The player inputs a word, and if the *target word*:
* Doesn't contain that letter, it is displayed as gray;
* Contains that letter, but the position is wrong, it is displayed as orange;
* Contains that letter, and the position is right, it is displayed as green.

The game ends if:
* The player correctly guesses the *target word*.
* The player runs out of tries.
* The player gives up and presses the corresponding button, revealing the word.

# Srtup
1. Install all required packages by executing `pip install -r requirements.txt`.

# Customization
1. Game title can be changed through the `TITLE` constant at `main.py`.
2. Browser favicon can be changed through `favicon.ico`.
3. Target word can be changed through the `TARGET_WORD` constant at `main.py`.
4. Maximum number of attempts can be changed through the `MAX_ATTEMPTS` constant at `main.py`.

# Running
1. Execute `uvicorn main:app --reload`.
2. In a browser, enter the address `http://localhost:8000`.
