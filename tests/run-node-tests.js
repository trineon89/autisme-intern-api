import assert from 'node:assert/strict';
import { parseEnvFile, resolveListenHost } from '../src/config/env.js';
import { addDays, isMonday, mondayFor, weekdaysForMonday, monthBounds } from '../src/utils/date.js';
import { parseCsv } from '../src/utils/csv.js';
import { hashPassword, verifyPassword } from '../src/infrastructure/password.js';
import { safeFileName } from '../src/infrastructure/file-storage.js';
import { buildApp } from '../src/app.js';

assert.deepEqual(parseEnvFile('A=1\nB="two"\n# ignored\nC=three'), { A: '1', B: 'two', C: 'three' });
assert.equal(resolveListenHost('production'), '0.0.0.0');
assert.equal(mondayFor('2026-06-03'), '2026-06-01');
assert.equal(isMonday('2026-06-01'), true);
assert.equal(addDays('2026-06-01', 4), '2026-06-05');
assert.deepEqual(weekdaysForMonday('2026-06-01'), ['2026-06-01', '2026-06-02', '2026-06-03', '2026-06-04', '2026-06-05']);
assert.deepEqual(monthBounds('2026-02'), { from: '2026-02-01', until: '2026-02-28' });
assert.deepEqual(parseCsv('a;b\n1;2\n"x;y";z'), [{ a: '1', b: '2' }, { a: 'x;y', b: 'z' }]);
assert.equal(safeFileName('../héllo world.pdf'), 'he-llo-world.pdf');
const hash = await hashPassword('secret', 'pepper');
assert.equal(await verifyPassword('secret', hash, 'pepper'), true);
assert.equal(await verifyPassword('wrong', hash, 'pepper'), false);


const app = await buildApp({
  config: {
    appEnv: 'test',
    isProduction: false,
    host: '127.0.0.1',
    port: 0,
    apiPublicUrl: 'https://api2.autisme.lu',
    corsOrigins: ['https://namnam.autisme.lu'],
    db: { host: '', port: 3306, database: '', user: '', password: '', connectionLimit: 1, ssl: false },
    authRequired: true,
    sessionTtlHours: 12,
    passwordPepper: 'test-pepper',
    internalApiToken: '',
    legacyApiKey: '',
    logLevel: 'silent',
    maxUploadBytes: 1024 * 1024,
    uploadDir: 'storage/uploads',
    reportDir: 'storage/reports',
    importDir: 'storage/imports'
  },
  db: { end: async () => {}, one: async () => ({ ok: 1 }) }
});

const htmlRoot = await app.inject({ method: 'GET', url: '/', headers: { accept: 'text/html' } });
assert.equal(htmlRoot.statusCode, 200);
assert.match(htmlRoot.headers['content-type'], /text\/html/);
assert.match(htmlRoot.body, /api2\.autisme\.lu endpoints/);
assert.match(htmlRoot.body, /\/docs\/openapi\.yaml/);

const jsonRoot = await app.inject({ method: 'GET', url: '/', headers: { accept: 'application/json' } });
assert.equal(jsonRoot.statusCode, 200);
assert.equal(jsonRoot.json().docs, '/docs/openapi.yaml');
assert.ok(jsonRoot.json().endpointCount > 0);

const docsRoot = await app.inject({ method: 'GET', url: '/docs', headers: { accept: 'text/html' } });
assert.equal(docsRoot.statusCode, 200);
assert.match(docsRoot.body, /Legacy compatibility/);

await app.close();

console.log('All node tests passed.');
