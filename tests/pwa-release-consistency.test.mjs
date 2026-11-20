import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const worker=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
const release=html.match(/const RELEASE="([^"]+)"/)?.[1];
const shell=worker.match(/const SHELL = "keirin-v([^"]+)"/)?.[1];

test('offline cache version tracks the actual app release',()=>{
 assert.ok(release,'App release must be declared');
 assert.ok(shell,'Service-worker shell version must be declared');
 assert.ok(shell===release||shell.startsWith(release+'-r'),
   'Service-worker cache must be tied to the current app release');
 assert.match(worker,/html\.includes\('const RELEASE=/);
});

test('app cache refresh checks the installed application and resources',()=>{
 assert.match(worker,/cache:\s*"reload"/);
 assert.match(worker,/if \(responses\.some/);
 assert.match(worker,/await caches\.delete\(SHELL\)/);
 assert.match(worker,/await self\.clients\.claim\(\)/);
});
