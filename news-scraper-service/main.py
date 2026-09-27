import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import PORT, HOST
from routers.news import router as news_router
from routers.sports import router as sports_router

app = FastAPI(
    title="News Nests Scraper & AI Microservice",
    description="Dedicated microservice for real-time news scraping, multi-country filtering, and AI summarization.",
    version="1.0.0"
)

# CORS middleware allowing requests from Node.js backend and React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register news router
app.include_router(news_router)
app.include_router(sports_router)

@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "service": "news-scraper-service",
        "version": "1.0.0"
    }

@app.get("/")
async def root():
    return {
        "service": "News Nests Scraper Microservice",
        "status": "running",
        "docs": "/docs"
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host=HOST, port=PORT, reload=True)
