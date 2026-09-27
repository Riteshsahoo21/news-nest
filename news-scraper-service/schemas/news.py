from typing import List, Optional
from pydantic import BaseModel, Field

class NewsItemMetadata(BaseModel):
    title: str
    summary: str = ""
    category: str
    subCategory: str = "general"          # 'general', 'esports', 'regional'
    country: str = "global"               # 'global', 'in', 'us', 'gb'
    language: str = "en"                  # 'en', 'hi'
    sourceName: str
    sourceUrl: str
    imageUrl: Optional[str] = ""
    mediaUrls: List[str] = Field(default_factory=list)
    isFeaturedOnHome: bool = True
    publishedAt: Optional[str] = None
    readTime: int = 2
    content: Optional[str] = ""
    isFullContentFetched: bool = False
    region: str = ""
    city: str = ""
    discoveryProvider: str = "curated-rss"

class FullContentResult(BaseModel):
    title: str
    content: str
    author: str = "News Desk"
    readTime: int = 2
    tags: List[str] = Field(default_factory=list)
    imageUrl: Optional[str] = ""
    mediaUrls: List[str] = Field(default_factory=list)
    aiSummary: str = ""
    keyTakeaways: List[str] = Field(default_factory=list)
    sourceUrl: str
    publishedAt: Optional[str] = None

class ExtractUrlRequest(BaseModel):
    url: str
    title: Optional[str] = None
    category: Optional[str] = None
    subCategory: Optional[str] = None
    country: Optional[str] = None
    imageUrl: Optional[str] = None
    fallbackContent: Optional[str] = None

class SummarizeRequest(BaseModel):
    text: str
    title: Optional[str] = ""

class SummarizeResponse(BaseModel):
    executiveSummary: str
    keyTakeaways: List[str] = Field(default_factory=list)
    readTime: int = 1
