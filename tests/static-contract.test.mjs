// Run with: node --test tests/static-contract.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
test('document and visible version match',()=>{
 const title=html.match(/<title>[^<]*実装版\s*([\d.]+)/);
 const heading=html.match(/<h1>[^<]*実装版\s*([\d.]+)/);
 assert.ok(title,'title version missing');
 assert.ok(heading,'visible version missing');
 assert.equal(title[1],heading[1]);
});
test('trio bet and fixed stake are displayed',()=>{
 assert.match(html, /3連複/);
 assert.match(html, /1点100円/);
 assert.match(html, /1〜3点/);
});
test('core input, prediction, review and backup panels exist',()=>{
 for(const id of ['entry','retryEntry','prediction','result','retryResult','metrics','backupPanel']){
   assert.match(html,new RegExp('id="'+id+'"'),id+' missing');
 }
});
test('race discovery cannot be misrepresented as automatic prediction import',()=>{
 assert.match(html,/予想への自動入力は未対応/);
});
