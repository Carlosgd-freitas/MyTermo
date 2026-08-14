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

# Setting up
1. Install all required packages by executing `pip install -r requirements.txt`.
2. In `main.py`, change the word that will be guessed on the `TARGET_WORD ` constant.
3. In `main.py`, change the maximum number of attempts on the `MAX_ATTEMPTS` constant.

# Running
1. Execute `uvicorn main:app --reload`.
2. In a browser, enter the address `http://localhost:8000`.
