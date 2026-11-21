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

test('latest official finish details override older data on repeat settlement',()=>{
 const match=html.match(/const knownFinish=([^;]+);/);
 assert.ok(match,'settlement merge missing');
 assert.match(match[1],/\.\.\.\(previous\.finish\?\?\{\}\),\.\.\.finish/);
 const previous={1:{rank:2},2:{rank:3}};
 const latest={1:{rank:1}};
 assert.deepEqual({...previous,...latest},{1:{rank:1},2:{rank:3}});
});

test('partial rider statistics contribute without fabricating a minimum',()=>{
 assert.match(html,/const availableStrengths=strengths\.filter\(Number\.isFinite\)/);
 assert.match(html,/availableStrengths\.length===3\?Math\.min/);
 assert.match(html,/availablePlaces\.length===3\?Math\.min/);
 const scores=[.8,null,.4].filter(Number.isFinite);
 assert.equal(scores.reduce((a,b)=>a+b,0)/scores.length,.6);
 assert.equal(scores.length===3?Math.min(...scores):null,null);
});

test('missing or invalid odds never become numeric ranking evidence',()=>{
 assert.match(html,/Object\.values\(odds\)\.filter\(o=>Number\.isFinite\(o\)&&o>0\)/);
 assert.match(html,/Number\.isFinite\(rawOdds\)&&rawOdds>0&&market\.length>=2&&maxO>minO/);
 const odds=[2.1,0,-4,Infinity,NaN,8.4];
 const valid=odds.filter(o=>Number.isFinite(o)&&o>0);
 assert.deepEqual(valid,[2.1,8.4]);
 const logs=valid.map(Math.log);
 assert.ok(logs.every(Number.isFinite));
});

test('partial rider statistics have confidence-weighted engine contribution',()=>{
 assert.match(html,/const coverage=\[availableStrengths\.length\/3/);
 assert.match(html,/knownWins\.length\/3/);
 assert.match(html,/item\.coverage\?\.\[i\]\?\?1/);
 const weighted=(value,weight,coverage)=>value*weight*coverage;
 assert.equal(weighted(.9,1,1/3),.3);
 assert.equal(weighted(.9,1,1),.9);
});

test('repeat settlement detects changes to existing official finish entries',()=>{
 assert.match(html,/const finishChanged=Object\.entries\(finish\)\.some/);
 assert.match(html,/if\(samePayout&&!timingAdded&&!finishChanged\)/);
 const previous={1:{rank:2}}, updated={1:{rank:1}};
 assert.ok(Object.entries(updated).some(([id,detail])=>JSON.stringify(previous[id]??null)!==JSON.stringify(detail)));
});
test('ticket count and learning statistics guard missing samples',()=>{
 assert.match(html,/const valid=scores\.length===3&&scores\.every\(Number\.isFinite\)&&scores\[0\]>=scores\[1\]&&scores\[1\]>=scores\[2\]/);
 assert.match(html,/count:valid\?countForGaps\(\{firstGap,secondGap\},policy\):BUY\.max/);
 assert.match(html,/if\(!Number\.isFinite\(n\)\|\|n<=0/);
});

test('official trio payout parser does not silently truncate long sections',()=>{
 assert.match(html,/for\(const part of parts\)\{/);
 assert.doesNotMatch(html,/parts\.map\(section=>section\.slice\(0,1200\)\)/);
});

test('market ranking needs two distinct valid odds before scoring',()=>{
 assert.match(html,/market\.length>=2&&maxO>minO/);
 assert.doesNotMatch(html,/maxO===minO\?\.5/);
});

test('market feature confidence accounts for incomplete combination coverage',()=>{
 assert.match(html,/const expectedCombos=ids\.length\*\(ids\.length-1\)\*\(ids\.length-2\)\/6/);
 assert.match(html,/Math\.min\(1,market\.length\/expectedCombos\)/);
 assert.match(html,/,marketCoverage,marketCoverage,1\]/);
 const combinations=n=>n*(n-1)*(n-2)/6;
 assert.equal(combinations(5),10);
 assert.equal(combinations(9),84);
});

test('service worker refreshes versioned shell and cleans old revisions',()=>{
 const worker=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
 assert.match(worker,/const SHELL = "keirin-v2\.4\.25-r\d+"/);
 assert.match(worker,/\(\?:-r\\d\+\)\?/);
 assert.match(worker,/await caches\.delete\(key\)/);
});
