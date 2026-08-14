from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

app = FastAPI()

# Hardcoded target for v0.1
TARGET_WORD = "TERMO"

class GuessRequest(BaseModel):
    word: str

@app.post("/api/guess")
def check_guess(request: GuessRequest):
    guess = request.word.upper()
    if len(guess) != 5:
        return {"error": "Word must be 5 letters."}
    
    # Naive validation for v0.1
    pattern = []
    for i in range(5):
        if guess[i] == TARGET_WORD[i]:
            pattern.append("correct")  # Green
        elif guess[i] in TARGET_WORD:
            pattern.append("present")  # Yellow
        else:
            pattern.append("absent")   # Gray
            
    return {"guess": guess, "pattern": pattern}

# Serve the frontend files from a folder called "static"
app.mount("/", StaticFiles(directory="static", html=True), name="static")
