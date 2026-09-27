import test from 'node:test';
import assert from 'node:assert/strict';
import { isCompleteScrapedArticle, selectRichestContent } from '../services/hybridNewsService.js';

const longBody = `${'A complete reported sentence with useful context and verified details. '.repeat(8)}`;

test('selectRichestContent keeps the longest cleaned body', () => {
  assert.equal(selectRichestContent('Short summary.', longBody), longBody.trim());
});

test('complete scraped articles pass the storage quality gate', () => {
  assert.equal(isCompleteScrapedArticle({
    content: longBody,
    isFullContentFetched: true,
    sourceUrl: 'https://publisher.example/story',
    sourceName: 'Publisher',
    author: 'Reporter',
    imageUrl: 'https://publisher.example/image.jpg',
    mainImageUrl: 'https://publisher.example/image.jpg',
    mediaUrls: ['https://publisher.example/image.jpg'],
    publishedAt: '2026-09-21T08:00:00.000Z',
    aiSummary: 'A sufficiently descriptive summary of the complete published article.',
    keyTakeaways: ['A concrete takeaway from the report.']
  }), true);
});

test('headline-only records are rejected before storage', () => {
  assert.equal(isCompleteScrapedArticle({
    content: 'Rothschild Redburn initiates Applied Digital stock with neutral rating',
    isFullContentFetched: false,
    sourceUrl: '',
    sourceName: '',
    author: 'Currents News',
    imageUrl: 'https://publisher.example/image.jpg',
    mediaUrls: [],
    publishedAt: null,
    aiSummary: '',
    keyTakeaways: []
  }), false);
});
