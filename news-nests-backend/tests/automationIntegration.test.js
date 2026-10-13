import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import News from '../models/News.js';
import LiveBlog from '../models/LiveBlog.js';
import { verifyAutomationKey } from '../middleware/automationAuth.js';

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const workflowDirectory = path.resolve(testDirectory, '../../n8n/workflows');

const invokeAutomationMiddleware = (providedKey) => {
  let statusCode = 200;
  let responseBody = null;
  let calledNext = false;
  const req = { get: (name) => name.toLowerCase() === 'x-automation-key' ? providedKey : '' };
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(body) {
      responseBody = body;
      return this;
    }
  };
  verifyAutomationKey(req, res, () => { calledNext = true; });
  return { statusCode, responseBody, calledNext };
};

test('semantic and live automation fields exist in the Mongoose schemas', () => {
  for (const field of ['backstory', 'relatedArticles', 'isDuplicateEcho', 'embeddingId', 'aiSummary', 'keyTakeaways']) {
    assert.ok(News.schema.path(field), `News schema is missing ${field}`);
  }
  for (const field of ['externalMatchId', 'lastExternalUpdateId']) {
    assert.ok(LiveBlog.schema.path(field), `LiveBlog schema is missing ${field}`);
  }
});

test('automation middleware rejects missing or incorrect keys and accepts the configured key', () => {
  const previousValue = process.env.N8N_AUTOMATION_KEY;
  process.env.N8N_AUTOMATION_KEY = 'test-automation-key-with-more-than-24-characters';
  try {
    const missing = invokeAutomationMiddleware('');
    assert.equal(missing.statusCode, 401);
    assert.equal(missing.calledNext, false);

    const incorrect = invokeAutomationMiddleware('wrong-key-with-more-than-24-characters');
    assert.equal(incorrect.statusCode, 401);
    assert.equal(incorrect.calledNext, false);

    const accepted = invokeAutomationMiddleware(process.env.N8N_AUTOMATION_KEY);
    assert.equal(accepted.statusCode, 200);
    assert.equal(accepted.calledNext, true);
  } finally {
    if (previousValue === undefined) delete process.env.N8N_AUTOMATION_KEY;
    else process.env.N8N_AUTOMATION_KEY = previousValue;
  }
});

test('all bundled n8n workflows are inactive, connected, and free of literal API secrets', () => {
  const files = fs.readdirSync(workflowDirectory).filter((name) => name.endsWith('.json'));
  assert.equal(files.length, 3);

  for (const fileName of files) {
    const raw = fs.readFileSync(path.join(workflowDirectory, fileName), 'utf8');
    const workflow = JSON.parse(raw);
    assert.equal(workflow.active, false);
    assert.ok(Array.isArray(workflow.nodes) && workflow.nodes.length > 0);

    const nodeNames = new Set(workflow.nodes.map((node) => node.name));
    assert.equal(nodeNames.size, workflow.nodes.length, `${fileName} has duplicate node names`);
    for (const [sourceName, outputs] of Object.entries(workflow.connections || {})) {
      assert.ok(nodeNames.has(sourceName), `${fileName} references unknown source ${sourceName}`);
      for (const branch of outputs.main || []) {
        for (const connection of branch) {
          assert.ok(nodeNames.has(connection.node), `${fileName} references unknown target ${connection.node}`);
        }
      }
    }

    assert.match(raw, /\$env\.N8N_AUTOMATION_KEY/);
    assert.doesNotMatch(raw, /AIza[0-9A-Za-z_-]{20,}/);
  }
});

