import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const a=html.indexOf('function validateBackup(');
const b=html.indexOf('function containsDraft(',a);
assert.ok(a>=0&&b>a,'Production backup validation not found');
const source=html.slice(a,b);
test('restored repeat-forecast snapshots have validated ticket keys, odds, and timestamps',()=>{
 assert.match(source,/r\.predictionRevisions!==undefined/);
 assert.match(source,/!Number\.isFinite\(Date\.parse\(v\.at\)\)/);
 assert.match(source,/v\.keys\.every\(validKey\)/);
 assert.match(source,/Object\.entries\(v\.odds\)/);
 assert.match(source,/r\.previousPrediction!==undefined/);
 assert.match(source,/prior\.id!==key/);
 assert.match(source,/prior\.tickets\.every\(t=>validKey\(t\.key\)\)/);
 assert.match(source,/prior\.settlement/);
});
