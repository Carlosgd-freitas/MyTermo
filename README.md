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

# Setup
1. Install all required packages by executing `pip install -r requirements.txt`.

# Customization
1. Game title can be changed through the `TITLE` constant at `config.py`.
2. Target words or phrases can be changed through the `TARGET` constant at `config.py`. **Note:** Every target in this list must have the same character ength.
Examples:
    * `TARGET = ["TERMO"]` -> Valid single target
    * `TARGET = ["MY", "TERMO"]` -> Invalid multiple targets 
    * `TARGET = ["BERRY", "JUICE"]` -> Valid multiple targets
1. Maximum number of attempts can be changed through the `MAX_ATTEMPTS` constant at `config.py`.
2. Characters given at the start of the game can be changed through the `GIVEN_TILES` constant at `config.py`.
3. Messages are present on `messages.py` and are grouped together by their context (Victory, Fail and Give Up). Each context is a dictionary, where the key is the language, and the value is a list of messages where one of them will be chosen randomly and shown once their condition is met.
4. New themes can be added directly to the `/themes` folder, as they are dinamically imported.
5. Frontend elements can be customized at `static/css/styles.css`.
6. Browser favicon can be changed through `favicon.ico`.

# Running
1. Execute `uvicorn main:app --reload`.
2. In a browser, enter the address `http://localhost:8000`.

# Planned Features
* Automated Tests
* Optional "Subject" box
* Better space given tiles (e.g. "MY TERMO" can't differentiate a " ")
* Repository stucture overhaul
