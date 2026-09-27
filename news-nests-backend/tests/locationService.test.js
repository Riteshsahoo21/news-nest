import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeLocalityName } from '../services/locationService.js';

test('removes administrative suffixes from reverse-geocoded city names', () => {
  assert.equal(normalizeLocalityName('Bhubaneswar Municipal Corporation'), 'Bhubaneswar');
  assert.equal(normalizeLocalityName('Bengaluru Municipality'), 'Bengaluru');
  assert.equal(normalizeLocalityName('Mumbai'), 'Mumbai');
});
