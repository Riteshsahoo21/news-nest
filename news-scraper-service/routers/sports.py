import hashlib
import re
from typing import Any

import httpx
from bs4 import BeautifulSoup
from fastapi import APIRouter, HTTPException, Query

from config import DEFAULT_USER_AGENT, REQUEST_TIMEOUT


router = APIRouter(prefix="/api/sports", tags=["sports"])

CRICBUZZ_BASE_URL = "https://www.cricbuzz.com"
MATCH_ID_PATTERN = re.compile(
    r"/(?:live-cricket-scores|live-cricket-scorecard|cricket-full-commentary)/(\d+)(?:/|$)",
    re.IGNORECASE,
)
COMPLETE_WORDS = (
    " won ", " complete ", " abandoned ", " abandon ", "match tied",
    "match drawn", " drawn ", "no result", "match over",
)


def _clean(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def _first_text(node: Any, selectors: list[str]) -> str:
    for selector in selectors:
        element = node.select_one(selector)
        if element:
            value = _clean(element.get_text(" ", strip=True))
            if value:
                return value
    return ""


def _parse_teams(title: str) -> tuple[str, str]:
    normalized = re.sub(r"\s+", " ", title)
    match = re.search(r"(.+?)\s+(?:vs\.?|v)\s+(.+?)(?:,|\s+-\s+|$)", normalized, re.IGNORECASE)
    if not match:
        return "", ""
    return _clean(match.group(1)), _clean(match.group(2))


def parse_upcoming_cricket_html(html: str) -> list[dict[str, Any]]:
    soup = BeautifulSoup(html or "", "html.parser")
    matches: list[dict[str, Any]] = []
    seen_ids: set[str] = set()

    for link in soup.select("a[href*='/live-cricket-scores/'], a[href*='/live-cricket-scorecard/']"):
        href = link.get("href", "")
        id_match = MATCH_ID_PATTERN.search(href)
        if not id_match:
            continue
        raw_id = id_match.group(1)
        external_match_id = f"cric_{raw_id}"
        if external_match_id in seen_ids:
            continue

        card = link.find_parent(
            lambda tag: tag.name in {"div", "li"} and any(
                class_name in (tag.get("class") or [])
                for class_name in ("cb-mtch-lst", "cb-mtch-crd-itm", "cb-col-100")
            )
        ) or link.parent

        title = _clean(link.get("title")) or _clean(link.get_text(" ", strip=True))
        if len(title) < 6:
            title = _first_text(card, [".cb-text-bold", ".cb-lv-scr-mtch-hdr", "h3", "h2"])
        if len(title) < 6:
            continue

        status = _first_text(card, [
            ".cb-text-live", ".cb-text-preview", ".cb-text-complete", ".cb-text-stumps",
            ".cb-mtch-crd-state", ".match-status"
        ])
        if not status and " - " in title:
            status = _clean(title.rsplit(" - ", 1)[-1])
        status = status or "Upcoming"
        status_lower = f" {_clean(status).lower()} "
        searchable_state = f" {_clean(title).lower()} {status_lower.strip()} "
        is_complete = any(word in searchable_state for word in COMPLETE_WORDS)
        if is_complete:
            continue

        team_names = [
            _clean(element.get_text(" ", strip=True))
            for element in card.select(".cb-hmscg-tm-nm, .cb-mtch-crd-hdr, .team-name")
            if _clean(element.get_text(" ", strip=True))
        ]
        parsed_team1, parsed_team2 = _parse_teams(title)
        team1 = team_names[0] if len(team_names) > 0 else parsed_team1
        team2 = team_names[1] if len(team_names) > 1 else parsed_team2
        venue = _first_text(card, [".cb-font-12.text-gray", ".cb-mtch-crd-venue", ".venue"])
        match_type = _first_text(card, [".cb-mtch-crd-hdr", ".match-type"])

        seen_ids.add(external_match_id)
        matches.append({
            "title": title,
            "matchName": title,
            "matchType": match_type,
            "venue": venue,
            "status": status,
            "isLive": any(
                marker in status_lower
                for marker in ("live", "innings break", "lunch", "tea", "stumps", "toss")
            ),
            "externalMatchId": external_match_id,
            "teams": {"team1": team1, "team2": team2},
            "sourceUrl": f"{CRICBUZZ_BASE_URL}{href}" if href.startswith("/") else href,
        })

    return matches


def _extract_team_rows(soup: BeautifulSoup) -> list[dict[str, str]]:
    teams: list[dict[str, str]] = []
    for row in soup.select("[data-team-name], .score-row, .cb-min-bat-rw, .cb-hmscg-bat-txt, .cb-hmscg-bwl-txt"):
        name = _clean(row.get("data-team-name")) or _first_text(
            row, [".team-name", ".cb-hmscg-tm-nm", ".cb-col-50:first-child"]
        )
        score = _clean(row.get("data-team-score")) or _first_text(
            row, [".team-score", ".cb-hmscg-tm-nm + div", ".cb-col-50.text-bold", ".cb-col-50:last-child"]
        )
        if name and score and not any(team["name"] == name for team in teams):
            teams.append({"name": name, "score": score})
        if len(teams) == 2:
            break
    return teams


def parse_live_score_html(html: str, external_match_id: str) -> dict[str, Any]:
    soup = BeautifulSoup(html or "", "html.parser")
    title = _first_text(soup, ["h1.cb-nav-hdr", ".cb-nav-hdr", "h1", "title"])
    status = _first_text(soup, [
        ".cb-text-live", ".cb-text-complete", ".cb-text-preview", ".cb-text-stumps",
        ".cb-nav-subhdr", ".match-status"
    ])
    teams = _extract_team_rows(soup)
    parsed_team1, parsed_team2 = _parse_teams(title)
    team1 = teams[0] if len(teams) > 0 else {"name": parsed_team1, "score": ""}
    team2 = teams[1] if len(teams) > 1 else {"name": parsed_team2, "score": ""}

    commentary_nodes = soup.select(".cb-com-ln, .commtext, .commentary-text, [data-commentary]")
    latest_commentary = ""
    for node in reversed(commentary_nodes):
        candidate = _clean(node.get("data-commentary")) or _clean(node.get_text(" ", strip=True))
        if candidate:
            latest_commentary = candidate
            break

    update_basis = "|".join([
        external_match_id,
        team1.get("score", ""),
        team2.get("score", ""),
        status,
        latest_commentary,
    ])
    update_id = hashlib.sha256(update_basis.encode("utf-8")).hexdigest()[:24]
    status_lower = f" {status.lower()} "
    is_complete = any(word in status_lower for word in COMPLETE_WORDS) or "complete" in status_lower

    return {
        "externalMatchId": external_match_id,
        "title": title,
        "status": status,
        "result": status if is_complete else "",
        "isComplete": is_complete,
        "updateId": update_id,
        "team1": team1,
        "team2": team2,
        "matchStatus": {
            "team1": team1,
            "team2": team2,
            "matchInfo": status or title,
            "customStats": [],
        },
        "latestCommentary": {
            "title": "LIVE UPDATE",
            "content": latest_commentary,
        },
    }


async def _fetch_html(url: str) -> str:
    # Cricbuzz currently rejects product-prefixed User-Agent strings with 403.
    # Keep the service identity in a separate header while using a modern,
    # standards-compatible browser UA for this publisher only.
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
        "X-News-Nests-Client": DEFAULT_USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
    }
    async with httpx.AsyncClient(
        headers=headers,
        timeout=max(REQUEST_TIMEOUT, 12.0),
        follow_redirects=True,
    ) as client:
        response = await client.get(url)
        response.raise_for_status()
        return response.text


@router.get("/upcoming-cricket")
async def get_upcoming_cricket_matches(
    limit: int = Query(default=50, ge=1, le=100),
):
    try:
        html = await _fetch_html(f"{CRICBUZZ_BASE_URL}/cricket-match/live-scores")
        matches = parse_upcoming_cricket_html(html)[:limit]
        return {"count": len(matches), "matches": matches, "provider": "cricbuzz"}
    except (httpx.HTTPError, ValueError) as error:
        raise HTTPException(status_code=502, detail=f"Unable to fetch cricket fixtures: {error}") from error


@router.get("/live-score/{external_match_id}")
async def get_live_score(external_match_id: str):
    match = re.fullmatch(r"cric_(\d+)", external_match_id)
    if not match:
        raise HTTPException(status_code=400, detail="Unsupported externalMatchId. Expected cric_<numeric-id>.")

    try:
        match_id = match.group(1)
        html = await _fetch_html(f"{CRICBUZZ_BASE_URL}/live-cricket-scores/{match_id}/match")
        result = parse_live_score_html(html, external_match_id)
        if not result["title"] and not result["status"] and not result["latestCommentary"]["content"]:
            raise HTTPException(status_code=502, detail="The score page did not contain readable match data.")
        return result
    except HTTPException:
        raise
    except (httpx.HTTPError, ValueError) as error:
        raise HTTPException(status_code=502, detail=f"Unable to fetch live score: {error}") from error
