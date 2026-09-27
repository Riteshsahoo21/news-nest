const sqlite3 = require(
  '/usr/local/lib/node_modules/n8n/node_modules/.pnpm/sqlite3@5.1.7_bluebird@3.7.2_supports-color@8.1.1/node_modules/sqlite3',
).verbose();
const { parse } = require(
  '/usr/local/lib/node_modules/n8n/node_modules/.pnpm/flatted@3.4.2/node_modules/flatted/cjs/index.js',
);

const database = new sqlite3.Database(
  '/home/node/.n8n/database.sqlite',
  sqlite3.OPEN_READONLY,
);

database.serialize(() => {
  database.get(
    "SELECT d.data FROM execution_data d JOIN execution_entity e ON e.id = d.executionId WHERE e.workflowId = 'U9agQxZHDmwCiqe2' AND e.status = 'error' ORDER BY e.id DESC LIMIT 1",
    (error, row) => {
      if (error) throw error;
      const raw = String(row?.data || '');
      const decoded = parse(raw);
      const workflowError = decoded?.resultData?.error || {};
      console.log(JSON.stringify({
        lastNodeExecuted: decoded?.resultData?.lastNodeExecuted,
        error: {
          name: workflowError.name,
          message: workflowError.message,
          description: workflowError.description,
          httpCode: workflowError.httpCode,
          nodeName: workflowError.node?.name,
        },
      }));
      database.close();
    },
  );
});
