@echo off
echo ===================================================
echo Starting News Nests Scraper & AI Microservice...
echo ===================================================
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
pause
