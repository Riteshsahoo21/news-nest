import os
import json
import re
import math
from typing import List, Dict
import httpx
from config import GEMINI_API_KEY

def extract_sentences(text: str) -> List[str]:
    """Splits text into meaningful sentences."""
    clean = re.sub(r"\n+", " ", text).strip()
    sentences = re.split(r"(?<=[.!?])\s+", clean)
    return [s.strip() for s in sentences if len(s.strip()) > 30 and not s.strip().startswith(("Click here", "Subscribe", "Photo:", "Image:"))]

def compute_word_frequencies(sentences: List[str]) -> Dict[str, float]:
    """Computes TF-IDF-inspired word frequency weights."""
    stop_words = {
        "the", "and", "is", "in", "to", "of", "a", "that", "it", "for", "on", "with",
        "as", "this", "was", "at", "by", "an", "be", "from", "or", "are", "have",
        "has", "had", "not", "were", "but", "what", "which", "will", "would", "there",
        "their", "they", "been", "one", "all", "out", "also", "into", "more", "up"
    }
    freq: Dict[str, int] = {}
    for sentence in sentences:
        words = re.findall(r"\b[a-zA-Z]{3,}\b", sentence.lower())
        for word in words:
            if word not in stop_words:
                freq[word] = freq.get(word, 0) + 1

    if not freq:
        return {}

    max_freq = max(freq.values())
    return {word: count / max_freq for word, count in freq.items()}

def local_nlp_summarize(text: str, title: str = "") -> dict:
    """
    High-performance extractive TextRank summarizer that runs 100% offline
    with zero API costs or dependencies.
    """
    sentences = extract_sentences(text)
    if not sentences:
        return {
            "executiveSummary": title or "Summary not available.",
            "keyTakeaways": [title] if title else []
        }

    if len(sentences) <= 3:
        return {
            "executiveSummary": " ".join(sentences[:2]),
            "keyTakeaways": sentences
        }

    word_weights = compute_word_frequencies(sentences)

    # Score each sentence by word weights and position
    sentence_scores = []
    for i, s in enumerate(sentences):
        words = re.findall(r"\b[a-zA-Z]{3,}\b", s.lower())
        score = sum(word_weights.get(w, 0.0) for w in words)
        length_penalty = math.sqrt(len(words)) if len(words) > 0 else 1.0
        norm_score = score / length_penalty

        # Position boost for early lead paragraphs (journalistic inverted pyramid)
        if i < 3:
            norm_score *= 1.35

        sentence_scores.append((norm_score, i, s))

    # Top sentences sorted by score
    top_scored = sorted(sentence_scores, key=lambda x: x[0], reverse=True)

    # Executive Summary: 2 most prominent lead sentences
    lead_sentences = sorted(top_scored[:2], key=lambda x: x[1])
    executive_summary = " ".join(item[2] for item in lead_sentences)

    # Key Takeaways: 3 distinct high-impact bullet points
    takeaway_candidates = sorted(top_scored[:3], key=lambda x: x[1])
    key_takeaways = [item[2] for item in takeaway_candidates]

    return {
        "executiveSummary": executive_summary,
        "keyTakeaways": key_takeaways
    }

async def gemini_summarize(text: str, title: str = "") -> dict:
    """Calls Google Gemini 1.5 Flash API for natural abstractive summaries."""
    try:
        model = os.getenv("GEMINI_TEXT_MODEL", "gemini-flash-lite-latest")
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={GEMINI_API_KEY}"
        prompt = (
            f"You are a professional senior news editor. Read the article below and produce a structured JSON summary:\n"
            f"Title: {title}\n"
            f"Article Content: {text[:4000]}\n\n"
            f"Output strictly valid JSON with this format:\n"
            f'{{"executiveSummary": "2-sentence executive summary.", "keyTakeaways": ["Bullet 1 with key fact", "Bullet 2 with cause/reaction", "Bullet 3 with outcome/next step"]}}'
        )

        payload = {
            "contents": [{
                "parts": [{"text": prompt}]
            }],
            "generationConfig": {
                "response_mime_type": "application/json",
                "temperature": 0.2
            }
        }

        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.post(url, json=payload)
            if res.status_code == 200:
                data = res.json()
                candidate_text = data["candidates"][0]["content"]["parts"][0]["text"]
                parsed = json.loads(candidate_text)
                if "executiveSummary" in parsed and "keyTakeaways" in parsed:
                    return parsed
    except Exception:
        pass

    # Fallback to local NLP if Gemini fails or network timeouts
    return local_nlp_summarize(text, title)

async def generate_ai_summary(text: str, title: str = "") -> dict:
    """Returns empty summary by default so scraping never consumes AI API credits."""
    return {
        "executiveSummary": "",
        "keyTakeaways": []
    }
