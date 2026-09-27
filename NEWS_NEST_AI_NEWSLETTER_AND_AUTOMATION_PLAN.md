# NEWS NEST: Full Autonomous Architecture & Implementation Plan
## Vector RAG Semantic Crosslinking, Zero-Touch Live Media, & AI-Powered Newsletter Engine

---

## Executive Overview

This specification unifies three interconnected systems for the **News Nest** ecosystem (`news-nests-backend`, `news-scraper-service`, and **n8n**):

1. **Pillar 1: 1 Embedding ➔ 4 Features (Semantic Crosslinker & "The Backstory" Box)**
   - Uses vector embeddings (Google Gemini Free Tier / 768-dim) and Vector DBs (Qdrant / Pinecone Free Tier) to replace crude RegEx matching.
   - Automatically detects duplicate articles ($>0.92$ similarity), cross-links semantically related companion articles ($0.75 - 0.90$ similarity), generates a 2-sentence **"The Backstory"** context box via LLM, and enables instant semantic search.
2. **Pillar 2: Zero-Touch Automated Live Media & Sports LiveBlog Feeder**
   - Fully automated scraping of cricket/sports fixtures from Cricbuzz/ESPNcricinfo 60–90 minutes before match time.
   - Auto-creates the `LiveBlog` in News Nest with SEO title, teams, venue, and `externalMatchId`.
   - Dedicated n8n polling worker streams ball-by-ball scores and commentary updates every 1–2 minutes, then cleanly concludes the blog (`isLive: false`) when the match ends.
3. **Pillar 3: AI-Assisted Automated Daily Newsletter (Smooth Texting + Live Media + The Backstory)**
   - Scheduled daily morning digest (08:00 AM) running via n8n.
   - Dynamically injects **🔴 Happening Now: Live Media** (live match scoreboards, stream rooms), an **AI 60-Second "Smooth-Texting" Briefing** (witty, conversational tone), **🔥 Top Trending Stories**, **⏳ The Backstory / Incident Flashback**, and **📰 Semantic Related Reads**.
   - Dispatches via Nodemailer / Brevo / SMTP with mobile-first responsive HTML.

---

```
                                    ┌─────────────────────────────────────────────────────────────┐
                                    │                   NEWS NEST CORE PLATFORM                   │
                                    │  • news-nests-backend (Express, Mongo, Redis, Nodemailer)   │
                                    │  • news-scraper-service (FastAPI, BeautifulSoup, Scrapers)  │
                                    │  • n8n Automation Engine (Self-Hosted / Cloud)              │
                                    └──────────────────────────────┬──────────────────────────────┘
                                                                   │
           ┌───────────────────────────────────────────────────────┼───────────────────────────────────────────────────────┐
           ▼                                                       ▼                                                       ▼
┌──────────────────────────────────────┐        ┌──────────────────────────────────────┐        ┌──────────────────────────────────────┐
│  PILLAR 1: SEMANTIC & BACKSTORY RAG  │        │   PILLAR 2: ZERO-TOUCH LIVE MEDIA    │        │  PILLAR 3: AI-AUTOMATED NEWSLETTER   │
│  "1 Embedding ➔ 4 Features"          │        │   "Automated LiveBlog & Sports"      │        │  "Smooth-Texting Daily Digest"       │
├──────────────────────────────────────┤        ├──────────────────────────────────────┤        ├──────────────────────────────────────┤
│ 1. Article Approved Webhook          │        │ 1. Fixture Scraper (Every 1h)        │        │ 1. Schedule Trigger (Daily 08:00 AM) │
│ 2. Gemini 768-dim Embedding          │        │ 2. Deduplicate vs existing blogs     │        │ 2. Query Active LiveBlogs (Scores)   │
│ 3. Qdrant / Pinecone Vector DB       │        │ 3. Auto-Create LiveBlog via API      │        │ 3. Query Trending News & Backstories │
│ 4. Similarity > 0.92: Echo Flag      │        │ 4. Ball-by-Ball Live Feeder (2 min)  │        │ 4. LLM "Smooth Texting" Summary      │
│ 5. Similarity 0.75-0.90: Auto-Relate │        │ 5. Auto-Post Commentary & Scores     │        │ 5. Assemble Backstory + Timeline     │
│ 6. LLM Generates "The Backstory" Box │        │ 6. Match Over ➔ Auto-Close `isLive`  │        │ 6. Render Responsive Luxury HTML     │
│ 7. Redis Cache Invalidation          │        │                                      │        │ 7. Blast via Nodemailer / Brevo      │
└──────────────────────────────────────┘        └──────────────────────────────────────┘        └──────────────────────────────────────┘
```

---

# SECTION 1: Pillar 1 — 1 Embedding ➔ 4 Features

### 1.1 The Technical Problem with RegEx Matching
In standard news backends, related news articles are queried using naive keyword or category filters:
```javascript
// Primitive RegEx: Fails if one article says "AI safety" and another "Machine Learning ethics"
News.find({ $or: [{ category: article.category }, { title: { $regex: keyword, $options: 'i' } }] })
```
RegEx has zero semantic awareness. Two articles covering the same ongoing trial or geopolitical conflict with different phrasing will never be cross-linked.

### 1.2 The Vector Architecture Solution
When an article is approved or published:
1. **Webhook Trigger**: `news-nests-backend` fires a webhook to n8n: `POST /webhook/article-approved` with payload `{ articleId, title, content, category, tags }`.
2. **Dense Vector Generation**: Google Gemini `text-embedding-004` (free) or HuggingFace generates a 768-dimensional embedding from `${title}\n\n${subtitle}\n\n${content.slice(0, 1200)}`.
3. **Vector DB Upsert**: Upserts the vector into **Qdrant Cloud** (free tier 1GB cluster) or **Pinecone Free Tier** with payload:
   ```json
   {
     "id": "65fa...",
     "title": "Article Title",
     "slug": "article-slug",
     "category": "technology",
     "publishedAt": "2026-09-22T08:00:00Z"
   }
   ```
4. **Nearest Neighbor Search**: Queries the Vector DB for the top 5 nearest neighbors using cosine similarity.
5. **The 4 Resulting Branches**:
   - **Branch 1 (Duplicate / Echo Detection)**: If nearest neighbor similarity is $> 0.92$, the article is an echo/repost of a syndicated wire story. Flag `isDuplicateEcho: true`.
   - **Branch 2 (Semantic Auto-Crosslinker)**: For matches scoring $0.75 - 0.90$, select the top 3 past articles. Make a `PUT /api/news/:id` updating `relatedArticles: [id1, id2, id3]`.
   - **Branch 3 ("The Backstory" Box Generator)**: 
     - An LLM reads the current article title + the 2 most relevant historical articles.
     - Prompt: *"In exactly two punchy sentences, write 'The Backstory' explaining the origin of this event based on the past articles. Start with '📌 The Backstory:'."*
     - Saves to `news.backstory` in MongoDB.
     - The frontend renders this box prominently at the top of the article.
   - **Branch 4 (Semantic Search & Cache Invalidation)**:
     - The article is now instantly indexed for meaning-based search queries on the frontend.
     - Invalidate Redis key `article:${slug}` and `news:trending`.

### 1.3 Schema Updates (`news-nests-backend/models/News.js`)
```javascript
// Add to newsSchema in models/News.js:
backstory: {
  type: String,
  default: '', // 2-sentence background context generated by LLM
},
relatedArticles: [
  {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'News',
  }
],
isDuplicateEcho: {
  type: Boolean,
  default: false,
  index: true,
},
embeddingId: {
  type: String,
  default: '',
}
```

---

# SECTION 2: Pillar 2 — Zero-Touch Automated Live Media & Sports LiveBlog

### 2.1 The Problem
Editorial teams waste hours manually typing match scores, creating LiveBlog shells, and updating commentary ball-by-ball.

### 2.2 The Autonomous Pipeline
1. **Schedule / Fixture Scraper (Runs Every 60 Minutes)**:
   - A scraper in `news-scraper-service` (`/sports/upcoming-cricket`) checks Cricbuzz/ESPNcricinfo for matches starting in the next 60–90 minutes.
   - Scrapes: `matchName`, `teams: { team1, team2 }`, `venue`, `matchType`, `externalMatchId` (e.g. `cric_99214`).
2. **Deduplication**:
   - n8n checks News Nest: `GET /api/live-blogs?externalMatchId=cric_99214`.
   - If not found, n8n calls `POST /api/live-blogs` with:
     ```json
     {
       "title": "India vs Australia 2nd ODI Live Score: Ball-by-Ball Updates & Commentary",
       "description": "Catch real-time ball-by-ball updates, scorecard, and live action from the Melbourne Cricket Ground.",
       "category": "sports",
       "isLive": true,
       "externalMatchId": "cric_99214",
       "matchStatus": {
         "team1": { "name": "India", "score": "Yet to bat" },
         "team2": { "name": "Australia", "score": "0/0 (0.0 ov)" },
         "matchInfo": "2nd ODI, Melbourne Cricket Ground"
       },
       "tags": ["Cricket", "IND vs AUS", "Live Score", "ODI"]
     }
     ```
3. **Ball-by-Ball Commentary Feeder (Runs Every 2 Minutes During Matches)**:
   - n8n queries News Nest: `GET /api/live-blogs?isLive=true`.
   - For every active blog having an `externalMatchId`:
     - Calls `GET /sports/live-score/:externalMatchId` in the scraper service.
     - Compares the latest ball/over with the last recorded update.
     - If new commentary exists (boundary, wicket, milestone):
       - Calls `POST /api/live-blogs/:id/updates` with `{ title: "WICKET! Starc strikes", content: "..." }`.
       - Calls `PUT /api/live-blogs/:id` with updated `matchStatus: { team1: { score: "185/4 (36.2 ov)" } }`.
4. **Auto-Closure (Match Complete)**:
   - When the scraper detects `status: "Australia won by 14 runs"` or `matchComplete: true`:
     - n8n posts a "MATCH OVER" summary update.
     - Calls `PUT /api/live-blogs/:id` with `{ "isLive": false }`.
     - The blog automatically transitions from "Live" to "Past Events" on the frontend.

### 2.3 Schema Updates (`news-nests-backend/models/LiveBlog.js`)
```javascript
// Add to liveBlogSchema in models/LiveBlog.js:
externalMatchId: {
  type: String,
  default: '', // e.g., 'cric_99214' or 'espn_4015'
  index: true,
}
```

### 2.4 Scraper Service Endpoint (`news-scraper-service/routers/sports.py`)
```python
import requests
from bs4 import BeautifulSoup
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api/sports", tags=["sports"])

@router.get("/upcoming-cricket")
def get_upcoming_cricket_matches():
    url = "https://www.cricbuzz.com/cricket-match/live-scores"
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
    try:
        res = requests.get(url, headers=headers, timeout=10)
        soup = BeautifulSoup(res.text, "html.parser")
        matches = []
        for card in soup.select(".cb-mtch-crd-itm"):
            title_el = card.select_one(".cb-text-bold")
            status_el = card.select_one(".cb-text-complete, .cb-text-preview, .cb-text-live")
            link_el = card.select_one("a[href*='/live-cricket-scores/']")
            if title_el and link_el:
                match_id = link_el["href"].split("/")[2]
                matches.append({
                    "title": title_el.text.strip(),
                    "status": status_el.text.strip() if status_el else "Upcoming",
                    "isLive": "live" in (status_el.text.lower() if status_el else ""),
                    "externalMatchId": f"cric_{match_id}"
                })
        return {"count": len(matches), "matches": matches}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

---

# SECTION 3: Pillar 3 — AI Daily Newsletter Engine

### 3.1 What Makes This Newsletter Elite:
1. **🔴 Live Media Integration (from Pillar 2)**:
   - If a live sports match or breaking blog is ongoing (`isLive: true`), a prominent red pulsing live card appears at the very top of the email:
     `🔴 LIVE: India 192/4 (38.1 ov) vs Australia 276`
     Includes a high-conversion button: **[Watch Live Stream / Join Live Room]**.
2. **⚡ "The 60-Second Wakeup Briefing"**:
   - The LLM writes an engaging, witty, conversational summary ("smooth texting" style like Morning Brew).
3. **🔥 Hot Topics Velocity Ranking**:
   - Top stories are scored and tagged with ranking badges (`#1 Trending Worldwide`, `#2 Tech Breakthrough`).
4. **⏳ The Backstory / Timeline Flashback (from Pillar 1)**:
   - For the #1 lead story, the email embeds the AI-generated `backstory` box directly in the newsletter so subscribers understand *How It Started* without needing to read months of archives.
5. **📰 Semantic Related Reads**:
   - Readers can click on related contextual story chips under each trending section.

### 3.2 Full Production HTML Email Template
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>News Nest Daily Digest</title>
  <style>
    body { margin: 0; padding: 0; background-color: #0c0d0e; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f3f4f6; }
    .wrapper { max-width: 600px; margin: 0 auto; background-color: #121417; border: 1px solid #262930; border-radius: 16px; overflow: hidden; }
    .header { padding: 32px 24px 20px; text-align: center; background: linear-gradient(180deg, #1a1d24 0%, #121417 100%); border-bottom: 1px solid #262930; }
    .logo { font-size: 26px; font-weight: 900; letter-spacing: -0.5px; color: #ffffff; text-decoration: none; }
    .logo span { color: #e11d48; }
    .tagline { font-size: 12px; color: #9ca3af; text-transform: uppercase; letter-spacing: 2px; margin-top: 6px; }
    .content { padding: 24px; }
    
    /* Live Media Card */
    .live-card { background: linear-gradient(135deg, rgba(225, 29, 72, 0.15) 0%, rgba(18, 20, 23, 0.8) 100%); border: 1px solid rgba(225, 29, 72, 0.4); border-radius: 14px; padding: 18px; margin-bottom: 24px; }
    .live-badge { display: inline-flex; align-items: center; gap: 6px; background-color: #e11d48; color: #ffffff; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; padding: 3px 8px; rounded: 6px; border-radius: 6px; }
    .pulse-dot { width: 8px; height: 8px; background-color: #ffffff; border-radius: 50%; display: inline-block; }
    .live-title { font-size: 16px; font-weight: 700; color: #ffffff; margin: 10px 0 6px; }
    .live-score { font-family: monospace; font-size: 14px; color: #fecdd3; margin-bottom: 12px; }
    .btn-live { display: inline-block; background-color: #e11d48; color: #ffffff; text-decoration: none; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; padding: 8px 16px; border-radius: 8px; }
    
    /* 60s Briefing */
    .briefing-box { background-color: #181b20; border-left: 4px solid #3b82f6; border-radius: 0 12px 12px 0; padding: 16px 20px; margin-bottom: 24px; }
    .briefing-title { font-size: 14px; font-weight: 800; color: #60a5fa; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
    .briefing-text { font-size: 14px; line-height: 1.6; color: #d1d5db; margin: 0; }
    
    /* Top Story & Backstory */
    .story-card { background-color: #16181d; border: 1px solid #262930; border-radius: 12px; padding: 18px; margin-bottom: 20px; }
    .rank-pill { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; padding: 2px 8px; border-radius: 20px; background-color: rgba(234, 179, 8, 0.15); color: #facc15; border: 1px solid rgba(234, 179, 8, 0.3); display: inline-block; margin-bottom: 10px; }
    .story-title { font-size: 18px; font-weight: 700; color: #ffffff; text-decoration: none; line-height: 1.4; display: block; margin-bottom: 8px; }
    .story-summary { font-size: 14px; color: #9ca3af; line-height: 1.6; margin: 0 0 12px; }
    
    /* The Backstory Box */
    .backstory-box { background-color: #101216; border: 1px dashed #d97706; border-radius: 8px; padding: 12px 14px; margin-top: 10px; font-size: 13px; color: #fbbf24; line-height: 1.5; }
    .backstory-box strong { color: #fef3c7; }
    
    /* Related chips */
    .related-chips { margin-top: 12px; padding-top: 10px; border-top: 1px solid #262930; font-size: 12px; color: #6b7280; }
    .related-chip { display: inline-block; background-color: #20242c; color: #93c5fd; text-decoration: none; padding: 3px 8px; border-radius: 6px; margin-right: 6px; margin-top: 4px; font-size: 11px; }
    
    /* Footer */
    .footer { text-align: center; padding: 24px; border-top: 1px solid #262930; font-size: 12px; color: #6b7280; }
    .footer a { color: #9ca3af; text-decoration: underline; }
  </style>
</head>
<body>
  <div style="padding: 20px 10px;">
    <div class="wrapper">
      <div class="header">
        <a href="https://newsnests.com" class="logo">NEWS <span>NESTS</span></a>
        <div class="tagline">Daily Intelligence &amp; Live Media Digest</div>
      </div>
      
      <div class="content">
        <!-- 1. LIVE MEDIA COVERAGE (Shown dynamically if a match/event is active) -->
        {{#if liveCoverage.isLive}}
        <div class="live-card">
          <div class="live-badge"><span class="pulse-dot"></span> HAPPENING NOW: LIVE MEDIA</div>
          <div class="live-title">{{liveCoverage.title}}</div>
          <div class="live-score">
            <strong>{{liveCoverage.matchStatus.team1.name}}:</strong> {{liveCoverage.matchStatus.team1.score}} &nbsp;|&nbsp; 
            <strong>{{liveCoverage.matchStatus.team2.name}}:</strong> {{liveCoverage.matchStatus.team2.score}}
          </div>
          <a href="{{liveCoverage.streamUrl}}" class="btn-live">Watch Stream / Join Live Room &rarr;</a>
        </div>
        {{/if}}

        <!-- 2. AI 60-SECOND SMOOTH BRIEFING -->
        <div class="briefing-box">
          <div class="briefing-title">⚡ The 60-Second Wakeup Briefing</div>
          <p class="briefing-text">{{aiBriefing.executiveText}}</p>
        </div>

        <!-- 3. TOP TRENDING STORIES & THE BACKSTORY -->
        {{#each topStories}}
        <div class="story-card">
          <span class="rank-pill">#{{this.rank}} {{this.badgeLabel}}</span>
          <a href="https://newsnests.com/article/{{this.slug}}" class="story-title">{{this.title}}</a>
          <p class="story-summary">{{this.punchySummary}}</p>

          {{#if this.backstory}}
          <div class="backstory-box">
            <strong>📌 The Backstory:</strong> {{this.backstory}}
          </div>
          {{/if}}

          {{#if this.relatedArticles.length}}
          <div class="related-chips">
            Related Context:
            {{#each this.relatedArticles}}
            <a href="https://newsnests.com/article/{{this.slug}}" class="related-chip">{{this.title}}</a>
            {{/each}}
          </div>
          {{/if}}
        </div>
        {{/each}}
      </div>

      <div class="footer">
        <p>You received this email because you subscribed to the News Nest Daily Briefing.</p>
        <p>
          <a href="https://newsnests.com/preferences?email={{subscriber.email}}">Update Topic Preferences</a> &nbsp;|&nbsp; 
          <a href="https://newsnests.com/unsubscribe?email={{subscriber.email}}">Unsubscribe</a>
        </p>
        <p>&copy; 2026 News Nest Media Inc. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>
```

---

# SECTION 4: Master Copy-Paste Prompt for VS Code GPT

Copy the complete block below and paste it directly into **VS Code GPT / GitHub Copilot Chat**:

***

```markdown
# Master Assignment: Implement Vector RAG, Zero-Touch LiveBlogs, and AI Newsletter Engine for News Nest

You are a Principal Full-Stack Engineer and n8n Workflow Architect.
I have a production news platform called **News Nest**:
- `news-nests-backend` (Node.js ES Modules, Express, Mongoose, Redis, Nodemailer)
- `news-scraper-service` (Python FastAPI, BeautifulSoup, feedparser)
- Existing models: `models/News.js`, `models/LiveBlog.js`, `models/Subscriber.js`, `models/Campaign.js`

I need you to implement **3 interconnected production systems**:
1. **Pillar 1: 1 Embedding ➔ 4 Features (Vector Semantic Crosslinker & 'The Backstory' Box)**
2. **Pillar 2: Zero-Touch Automated Live Media & Sports LiveBlog Feeder**
3. **Pillar 3: AI-Assisted Daily Newsletter (Live Media + Smooth Texting + The Backstory)**

---

## Deliverable 1: Pillar 1 Backend Code & n8n Workflow

1. Update `news-nests-backend/models/News.js`:
   Add fields:
   - `backstory`: { type: String, default: '' }
   - `relatedArticles`: [{ type: mongoose.Schema.Types.ObjectId, ref: 'News' }]
   - `isDuplicateEcho`: { type: Boolean, default: false, index: true }
   - `embeddingId`: { type: String, default: '' }

2. In `news-nests-backend/controllers/newsController.js`:
   - When an article status is updated to `'approved'`, trigger a webhook: `POST http://localhost:5678/webhook/article-approved` with `{ articleId, title, content, category, tags }`.
   - Create endpoint `PUT /api/news/:id/backstory-and-related`: Accepts `{ backstory, relatedArticles, isDuplicateEcho }`, updates MongoDB, and invalidates Redis cache `article:${slug}`.

3. Provide the complete importable **n8n Workflow JSON** for `workflow_1_vector_backstory.json`:
   - **Webhook Trigger:** Receives approved article.
   - **Gemini Embeddings Node:** Generates 768-dim vector (free tier).
   - **Qdrant / Pinecone Node:** Upserts vector and queries top 5 nearest neighbors.
   - **Filter & Branching:**
     - If score > 0.92: Flag as duplicate.
     - If score 0.75–0.90: Grab top 3 IDs for `relatedArticles`.
   - **OpenAI Node (gpt-4o-mini):** Reads new article + top 2 past articles, writes a 2-sentence summary starting with `"📌 The Backstory:"`.
   - **HTTP Request Node:** Calls `PUT /api/news/:id/backstory-and-related`.

---

## Deliverable 2: Pillar 2 Scraper Endpoint & Live Feeder Workflow

1. Update `news-nests-backend/models/LiveBlog.js`:
   Add field:
   - `externalMatchId`: { type: String, default: '', index: true }

2. Create `news-scraper-service/routers/sports.py`:
   - Fast-API router with `GET /api/sports/upcoming-cricket` scraping Cricbuzz for matches starting within 60–90 min, returning `{ title, matchType, venue, externalMatchId }`.
   - `GET /api/sports/live-score/:externalMatchId`: Scrapes live score (`team1: score`, `team2: score`, overs, latest commentary update, and `isComplete: bool`).

3. Provide the complete importable **n8n Workflow JSON** for `workflow_2_live_sports_feeder.json`:
   - **Cron A (Every 1 Hour):** Calls `/api/sports/upcoming-cricket`, checks News Nest if already created, and calls `POST /api/live-blogs` if new.
   - **Cron B (Every 2 Minutes):** Queries `GET /api/live-blogs?isLive=true`, fetches live scores from the scraper, calls `POST /api/live-blogs/:id/updates` for new balls/overs, and updates `matchStatus`. When match ends, sends final update and sets `isLive: false`.

---

## Deliverable 3: Pillar 3 Automated AI Newsletter Workflow

Provide the complete importable **n8n Workflow JSON** for `workflow_3_ai_newsletter.json`:
1. **Schedule Trigger:** Runs every day at 08:00 AM.
2. **Data Ingestion Nodes:**
   - Fetch active subscribers: `GET /api/newsletter/subscribers`.
   - Fetch active live media: `GET /api/live-blogs?isLive=true`.
   - Fetch top 5 trending articles: `GET /api/news?status=approved&isTrending=true&limit=5` (populating `backstory` and `relatedArticles`).
3. **AI Editorial Node (OpenAI / Claude):**
   - Writes a conversational, witty, 60-second "smooth texting" summary of the top news (Morning Brew style).
4. **HTML Template Node:**
   - Renders the responsive dark-mode HTML template with:
     - 🔴 **Live Media Banner** (pulsing badge, live scorecard, stream button).
     - ⚡ **60-Second Smooth Briefing**.
     - 🔥 **Top Stories with #1, #2 Badges**.
     - ⏳ **The Backstory Box** for the lead event.
     - 📰 **Semantic Related Article Chips**.
     - **Unsubscribe & Topic Preferences Footer**.
5. **Send Email Node:**
   - Dispatches via Nodemailer / Brevo / SMTP.

Please output the complete, tested code files and valid n8n JSON exports.
```

***

# SECTION 5: Verification & Testing Checklist

| Step | Verification Target | Expected Result |
| :--- | :--- | :--- |
| **1** | Webhook Trigger on Article Approval | Publishing/approving an article in News Nest immediately triggers `POST /webhook/article-approved` in n8n. |
| **2** | Gemini Embedding & Vector Search | Returns 768-dim vector; Qdrant/Pinecone finds older semantically related articles ($0.75 - 0.90$ similarity). |
| **3** | "The Backstory" Generation | Article document in MongoDB updates with `backstory: "📌 The Backstory: ..."` and `relatedArticles: [id1, id2, id3]`. |
| **4** | Fixture Scraper Execution | `GET /api/sports/upcoming-cricket` returns matches starting within 60-90 min with clean `externalMatchId`. |
| **5** | Auto-Creation of LiveBlog | News Nest database contains auto-created `LiveBlog` with `isLive: true` and team scoreboards. |
| **6** | Ball-by-Ball Live Commentary | LiveBlog updates array receives real-time overs/wickets every 1-2 minutes without manual editor input. |
| **7** | Newsletter Live Media Card | When an event is active, email renders the red pulsing live scorecard with direct streaming button. |
| **8** | Newsletter Backstory & Related Chips | The email lead story displays the historical backstory box and clickable companion links. |
