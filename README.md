# NewsNest - Intelligent AI-Powered News Ecosystem

An end-to-end, real-time news aggregation, editorial, AI backstory enrichment, and newsletter publishing platform.

---

## 🏗️ Architecture Overview

The NewsNest platform is composed of four decoupled, production-grade microservices:

```
news-nest/
├── news-nests-backend/       # Node.js Express REST API, MongoDB, Redis BullMQ, Webhooks
├── news-nests-frontend/      # React 19, Vite, SSR Support, TailwindCSS, Firebase Auth
├── news-scraper-service/     # Python FastAPI Real-time RSS & Web Ingestion Engine
├── n8n/                      # AI Orchestration (Vector Backstories, Fact-Check, Newsletters)
├── check-all.ps1             # Master Health Check Script (tests all 6 services)
└── NEWS_NEST_AI_NEWSLETTER_AND_AUTOMATION_PLAN.md
```

---

## ⚡ Service Directory

### 1. `news-nests-backend` (Port 5000)
- **Framework**: Express.js, Node.js
- **Database**: MongoDB (Mongoose ODM)
- **Caching & Queues**: Redis BullMQ
- **Features**:
  - News aggregation & editorial management
  - Webhook integration with n8n (`/api/automation/*`)
  - Full-text and slug search, category & country filtering
  - Live blogs, comments, photo galleries, notifications

### 2. `news-nests-frontend` (Port 5174)
- **Framework**: React 19 + Vite (with Node.js SSR support)
- **Styling**: TailwindCSS & Glassmorphism design tokens
  - **Auth**: Google OAuth + Custom JWT
- **Features**:
  - AI Summary Card ("Quick 3-Bullet Takeaway")
  - Historical Backstory Widget ("Why This Matters")
  - Breaking news tickers, category pills, video player

### 3. `news-scraper-service` (Port 8000)
- **Framework**: Python 3.11+, FastAPI, Uvicorn
- **Engines**: BeautifulSoup4, Feedparser, Trafilatura, Newspaper3k
- **Features**:
  - Multi-source RSS feed discovery
  - Real-time article text and metadata extraction
  - Automatic push to backend ingestion pipelines

### 4. `n8n` AI Workflows (Port 5678) & Qdrant (Port 6333)
- **Vector DB**: Qdrant (`points_count: 18+`, 768-dimensional embeddings)
- **LLM / Embedding**: Google Gemini (`gemini-3.8-flash`, `gemini-embedding-2`)
- **Workflows**:
  - **Workflow 1**: Vector Ingestion & Semantic Historical Backstory Generation
  - **Workflow 2**: Autonomous Fact-Checking & Credibility Scoring
  - **Workflow 3**: 60-Second Morning AI Newsletter Generator

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js 18+
- Python 3.11+
- Docker & Docker Compose
- MongoDB (local or Atlas)
- Redis

### 1. Start Infrastructure (Docker)
```powershell
# In n8n directory
cd n8n
docker compose up -d
```

### 2. Configure Environment Files
Each service has an `.env.example` file. Copy to `.env` and fill in credentials:
```powershell
cp news-nests-backend/.env.example news-nests-backend/.env
cp news-nests-frontend/.env.example news-nests-frontend/.env
cp news-scraper-service/.env.example news-scraper-service/.env
cp n8n/.env.example n8n/.env
```

### 3. Run All Services
```powershell
# Terminal 1: Backend
cd news-nests-backend
npm install
npm run dev

# Terminal 2: Frontend
cd news-nests-frontend
npm install
npm run dev

# Terminal 3: Scraper
cd news-scraper-service
pip install -r requirements.txt
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

### 4. Verify System Health
Run the comprehensive PowerShell diagnostic check:
```powershell
.\check-all.ps1
```

---

## 📜 Preserved Commit History

This monorepo preserves 100% of historical commits, dates, and author metadata from both standalone services:
- **July 10, 2026**: Initial backend setup (`5fc6edf`)
- **July 15, 2026**: Complete API structure (`a2b6267`)
- **July 17, 2026**: Full backend architecture (`4da23d1`)
- **July 28, 2026**: Revenue tracking, rate limiters, audit logs (`f870764`)
- **August 2, 2026**: Engagement endpoints & ObjectId/slug resolution (`461b523`)
- **August 2, 2026**: Frontend architecture & components (`0719abd`)
- **September 27, 2026**: Automation webhooks, AI summary cards, backstory cards, n8n vector workflows (`c7fabcc`, `1ca421e`)
