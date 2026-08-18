"""FastAPI application entry point serving assets and API routes."""

from pathlib import Path
from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from src.api.routes import router

app = FastAPI()

# Resolve the root directory by stepping up two levels
BASE_DIR = Path(__file__).resolve().parent.parent
STATIC_DIR = BASE_DIR / "static"
THEMES_DIR = BASE_DIR / "themes"

# Mount your static directories
app.mount("/js", StaticFiles(directory=STATIC_DIR / "js"), name="js")
app.mount("/css", StaticFiles(directory=STATIC_DIR / "css"), name="css")

if THEMES_DIR.exists():
    app.mount("/themes", StaticFiles(directory=THEMES_DIR), name="themes")

app.include_router(router)


@app.get("/")
async def read_index():
    """Serve main single-page application entry point."""
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/translations.js")
async def read_translations():
    """Serve client translation dictionary."""
    return FileResponse(STATIC_DIR / "js" / "translations.js")


@app.get("/app.js")
async def read_app():
    """Serve client application logic file."""
    return FileResponse(STATIC_DIR / "js" / "app.js")
