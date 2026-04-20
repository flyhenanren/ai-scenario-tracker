import sys
import os
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse

from backend.database import init_db
from backend.routers import scenarios, followups

app = FastAPI(
    title="AI场景评估追踪系统",
    description="用于管理公司内部AI场景填报、跟进和评估的系统",
    version="1.0.0"
)

# Initialize database
init_db()

# Include routers
app.include_router(scenarios.router)
app.include_router(followups.router)

# Get the directory where this file is located
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(current_dir)

# Mount static files
static_dir = os.path.join(project_root, "static")
if os.path.exists(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")

frontend_dir = os.path.join(project_root, "frontend")
if os.path.exists(frontend_dir):
    app.mount("/frontend", StaticFiles(directory=frontend_dir, html=True), name="frontend_static")


@app.get("/")
def root():
    return RedirectResponse(url="/frontend/index.html")


@app.get("/api/health")
def health_check():
    return {"status": "ok", "message": "AI场景评估追踪系统运行中"}
