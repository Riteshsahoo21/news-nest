# News Nest n8n automation

You do **not** need to build nodes manually. The `workflows` directory contains three importable workflows:

1. `workflow_1_vector_backstory.json`
   - Receives article-approval webhooks.
   - Backfills approved scraper articles every 10 minutes.
   - Creates 768-dimensional Gemini embeddings.
   - Queries and upserts Qdrant vectors.
   - Detects duplicate echoes, creates semantic crosslinks, and writes The Backstory.
2. `workflow_2_live_sports_feeder.json`
   - Discovers cricket fixtures hourly.
   - Creates one LiveBlog per provider match ID.
   - Polls scores every two minutes, deduplicates commentary, and closes completed matches.
3. `workflow_3_ai_newsletter.json`
   - Runs daily at 08:00 Asia/Kolkata.
   - Fetches live coverage and the five strongest stories.
   - Writes the 60-second briefing and renders responsive HTML.
   - Sends personalized messages through the existing News Nest SMTP service, keeping subscriber addresses out of n8n.

## Fast self-hosted setup

Requirements: Docker Desktop, the backend on port 5000, the scraper on port 8000, and the frontend on port 5174.

From PowerShell:

```powershell
cd C:\office\project2\n8n
.\setup.ps1 -GeminiApiKey 'YOUR_GOOGLE_AI_STUDIO_KEY' -StartContainers
```

Open `http://localhost:5678` and create the first owner account. Then import automatically:

```powershell
.\setup.ps1 -GeminiApiKey 'YOUR_GOOGLE_AI_STUDIO_KEY' -ImportWorkflows
```

The second command reuses the generated keys. Restart the backend afterward if this was the first setup run so it reloads `news-nests-backend/.env`.

For an existing n8n instance, use **Workflows -> Import from File** for the three JSON files and provide the environment variables listed in `.env.example`. This imports the full canvas; no node creation is required.

## First activation checklist

1. Ensure the backend, scraper, n8n, and Qdrant health endpoints respond.
2. Run each workflow once manually and inspect the result.
3. Publish the workflows only after the test execution succeeds.
4. Set `N8N_ARTICLE_WEBHOOK_URL` on the backend to the production webhook URL shown by the first workflow.
5. Use HTTPS for public production endpoints and keep `N8N_AUTOMATION_KEY`, `GEMINI_API_KEY`, SMTP credentials, and Qdrant credentials out of Git.

## Health checks

```powershell
Invoke-RestMethod http://localhost:8000/health
Invoke-RestMethod http://localhost:6333/healthz
$headers = @{ 'x-automation-key' = $env:N8N_AUTOMATION_KEY }
Invoke-RestMethod http://localhost:5000/api/automation/status -Headers $headers
```

## Important behavior

- Workflow JSON files contain no secrets.
- Subscriber emails stay in the backend and automated newsletters are sent individually for working preference/unsubscribe links.
- Qdrant point IDs are deterministic UUIDs derived from Mongo article IDs, so reruns update rather than duplicate vectors.
- The backend rejects automation calls unless the shared key has at least 24 characters and matches in constant time.
- Workflows import inactive intentionally. This prevents accidental email sends or API usage before configuration is checked.
