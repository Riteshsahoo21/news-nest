import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSearchFilter,
  buildLiteralSearchRegex,
  normalizeSearchQuery,
  parsePagination,
  tokenizeSearchQuery
} from '../utils/searchQuery.js';

test('normalizes whitespace and keeps quoted phrases as one term', () => {
  assert.equal(normalizeSearchQuery('  climate   policy  '), 'climate policy');
  assert.deepEqual(
    tokenizeSearchQuery('climate policy "New Delhi" climate'),
    ['climate', 'policy', 'New Delhi']
  );
});

test('treats regular-expression characters as literal search text', () => {
  const filter = buildSearchFilter('C++ [AI]', ['title']);
  const andClauses = filter.$and || (filter.$or && filter.$or[0].$and);
  assert.equal(andClauses.length, 2);
  assert.equal(andClauses[0].$or[0].title.$regex.test('A C++ release'), true);
  assert.equal(andClauses[1].$or[0].title.$regex.test('Daily [AI] briefing'), true);
  assert.equal(andClauses[1].$or[0].title.$regex.test('Daily A briefing'), false);
});

test('matches whole words and phrases without substring ambiguity', () => {
  const modi = buildLiteralSearchRegex('Modi');
  assert.equal(modi.test('Prime Minister Modi addressed the meeting'), true);
  assert.equal(modi.test('The modification was approved'), false);

  const hindiName = buildLiteralSearchRegex('मोदी');
  assert.equal(hindiName.test('प्रधानमंत्री मोदी ने कहा'), true);
  assert.equal(hindiName.test('मोदीकरण'), false);
});

test('caps pagination and calculates a stable offset', () => {
  assert.deepEqual(
    parsePagination({ page: '3', limit: '500' }, { limit: 24, maxLimit: 100 }),
    { page: 3, limit: 100, skip: 200 }
  );
});
