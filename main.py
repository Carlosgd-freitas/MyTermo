from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from routes import router

app = FastAPI()

# Include API routes
app.include_router(router)

# Mount Static Files
app.mount("/", StaticFiles(directory="static", html=True), name="static")
