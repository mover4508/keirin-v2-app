import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const start=html.indexOf('function settleRecord(record,raw)');
const end=html.indexOf('function readRacePacket(',start);
assert.ok(start>=0&&end>start,'Production settlement function not found');
const settlement=html.slice(start,end);

test('official result is matched to the exact saved race',()=>{
 assert.match(settlement,/official\.id!==record\.id/);
 assert.match(settlement,/parseResult\(raw,record\.input\.ids\)/);
});

test('all selected tickets receive both positive and negative explanations',()=>{
 assert.match(settlement,/record\.tickets\.map\(t=>/);
 assert.match(settlement,/return \{key:t\.key,hit,refund,positive:/);
 assert.match(settlement,/negative:/);
 assert.match(settlement,/analysis,stake:record\.tickets\.length\*BUY\.yen/);
});

test('official corrections and duplicate results are handled deliberately',()=>{
 assert.match(settlement,/samePayout&&!timingAdded&&!finishChanged/);
 assert.match(settlement,/previous&&!samePayout&&!correction\(raw\)/);
 assert.match(settlement,/const knownFinish=samePayout\?/);
});

test('stake, payouts, refunds, and hits are recorded per selected ticket',()=>{
 assert.match(settlement,/const payout=record\.tickets\.reduce/);
 assert.match(settlement,/refundYen:analysis\.filter\(x=>x\.refund\)\.length\*BUY\.yen/);
 assert.match(settlement,/hits:analysis\.filter\(x=>x\.hit\)\.length/);
 assert.match(settlement,/await persist\(/);
});
