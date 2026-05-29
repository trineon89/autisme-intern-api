import assert from 'node:assert/strict';
import { parseEnvFile } from '../src/config/env.js';
import { addDays, isMonday, mondayFor, weekdaysForMonday, monthBounds } from '../src/utils/date.js';
import { parseCsv } from '../src/utils/csv.js';
import { hashPassword, verifyPassword } from '../src/infrastructure/password.js';
import { safeFileName } from '../src/infrastructure/file-storage.js';

assert.deepEqual(parseEnvFile('A=1\nB="two"\n# ignored\nC=three'), { A: '1', B: 'two', C: 'three' });
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

console.log('All node tests passed.');
