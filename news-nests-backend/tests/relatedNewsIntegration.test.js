import test from 'node:test';
import assert from 'node:assert/strict';
import { extractSalientEntities, calculateHeadlineSimilarity } from '../services/recommendationService.js';

test('universal recommendation entities extract key nouns across diverse news categories', () => {
  // 1. Finance / Central Bank
  const rbi = extractSalientEntities('RBI Governor Shaktikanta Das holds repo rate at 6.5%', ['rbi', 'banking', 'economy']);
  assert.ok(rbi.includes('rbi'));
  assert.ok(rbi.some(e => e.includes('shaktikanta das') || e.includes('shaktikanta')));
  assert.ok(rbi.some(e => e.includes('repo')));

  // 2. Entertainment / Creators
  const yt = extractSalientEntities('CarryMinati drops viral roast video featuring Bigg Boss stars', ['carryminati', 'youtube']);
  assert.ok(yt.includes('carryminati'));
  assert.ok(yt.some(e => e.includes('bigg boss') || e.includes('roast')));

  // 3. Esports / Hardware
  const esports = extractSalientEntities('SK Rossi signs with new Valorant roster using Razer Viper V3 Pro', ['skrossi', 'valorant', 'esports']);
  assert.ok(esports.includes('skrossi'));
  assert.ok(esports.includes('valorant'));
  assert.ok(esports.some(e => e.includes('razer viper') || e.includes('viper') || e.includes('razer')));

  // 4. Civic / Coastal
  const pulicat = extractSalientEntities('Pulicat fishermen urge Tamil Nadu govt to demarcate fishing grounds using GPS', ['pulicat', 'fisheries']);
  assert.ok(pulicat.some(e => e.includes('pulicat')));
  assert.ok(pulicat.some(e => e.includes('tamil nadu')));
});

test('headline deduplication detects high-overlap syndicate titles', () => {
  const t1 = 'India launches INSAT-4G weather satellite from Sriharikota';
  const t2 = 'India successfully launches INSAT-4G meteorological satellite from Sriharikota';
  const score = calculateHeadlineSimilarity(t1, t2);
  assert.ok(score >= 0.60, `Expected high similarity between syndicated satellite stories, got ${score}`);
});
