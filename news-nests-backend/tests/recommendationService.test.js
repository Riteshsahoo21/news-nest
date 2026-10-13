import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractSalientEntities,
  calculateHeadlineSimilarity
} from '../services/recommendationService.js';

test('extractSalientEntities extracts multi-word entities, gear models, and tags', () => {
  const title = 'Topson clutches with Logitech G Pro X ahead of TI 2024 Grand Finals';
  const tags = ['dota2', 'esports', 'mouse'];
  const entities = extractSalientEntities(title, tags);

  // Check tags included
  assert.ok(entities.includes('dota2'));
  assert.ok(entities.includes('esports'));
  assert.ok(entities.includes('mouse'));

  // Check proper nouns and model names extracted
  assert.ok(entities.some(e => e.includes('topson')));
  assert.ok(entities.some(e => e.includes('logitech') || e.includes('pro')));
  assert.ok(entities.some(e => e.includes('grand finals') || e.includes('finals')));
});

test('extractSalientEntities handles civic and medical articles', () => {
  const title = 'Pulicat fishermen urge Tamil Nadu govt to demarcate fishing grounds using GPS';
  const tags = ['tamilnadu', 'fisheries'];
  const entities = extractSalientEntities(title, tags);

  assert.ok(entities.includes('tamilnadu'));
  assert.ok(entities.includes('fisheries'));
  assert.ok(entities.some(e => e.includes('pulicat')));
  assert.ok(entities.some(e => e.includes('gps')));
});

test('calculateHeadlineSimilarity detects near-duplicate syndicated headlines', () => {
  const title1 = 'RBI keeps repo rate unchanged at 6.5 percent citing inflation';
  const title2 = 'RBI keeps repo rate unchanged at 6.5% citing inflation trajectory';
  const score = calculateHeadlineSimilarity(title1, title2);

  // Near duplicate should have high similarity > 0.70
  assert.ok(score >= 0.70, `Expected high similarity for syndicated news, got ${score}`);

  // Unrelated titles should have low similarity < 0.20
  const title3 = 'Arsenal wins dramatic derby against Tottenham in stoppage time';
  const unrelatedScore = calculateHeadlineSimilarity(title1, title3);
  assert.ok(unrelatedScore < 0.20, `Expected low similarity for unrelated news, got ${unrelatedScore}`);
});
