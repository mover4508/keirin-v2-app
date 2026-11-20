import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const start=html.indexOf('function availableLearningHistory(');
const end=html.indexOf('function venueTrialReview(',start);
assert.ok(start>=0&&end>start,'Production history selection function missing');
const ctx={
 Date,Number,parseInt,
 eligibleForLearning:r=>r.eligible!==false,
 storedStart:r=>r.startAt
};
runInNewContext(html.slice(start,end),ctx);
const candidate={date:'2026-11-21',venue:'青森',race:'5R'};
const created='2026-11-21T06:00:00Z';
const row=(id,recordedAt,overrides={})=>({
 id,createdAt:'2026-11-20T01:00:00Z',
 settlement:{recordedAt},...overrides
});
const select=(rows,startAt='2026-11-21T05:00:00Z')=>
 ctx.availableLearningHistory(rows,candidate,startAt,created);

test('future results and results recorded after prediction are excluded',()=>{
 const rows=[
  row('2026-11-20 青森 4R','2026-11-20T09:00:00Z'),
  row('2026-11-20 青森 3R','2026-11-21T07:00:00Z'),
  row('2026-11-22 青森 1R','2026-11-20T09:00:00Z'),
  row('2026-11-20 青森 2R','2026-11-20T09:00:00Z',{createdAt:'2026-11-21T07:00:00Z'})
 ];
 assert.deepEqual(Array.from(select(rows),r=>r.id),['2026-11-20 青森 4R']);
});

test('same-day races require earlier start or same-venue earlier race number',()=>{
 const rows=[
  row('2026-11-21 青森 3R','2026-11-21T04:00:00Z',{startAt:'2026-11-21T03:00:00Z'}),
  row('2026-11-21 青森 6R','2026-11-21T04:00:00Z',{startAt:'2026-11-21T04:00:00Z'}),
  row('2026-11-21 別府 1R','2026-11-21T04:00:00Z'),
  row('2026-11-21 青森 4R','2026-11-21T04:00:00Z')
 ];
 assert.deepEqual(Array.from(select(rows),r=>r.id),[
  '2026-11-21 青森 3R','2026-11-21 青森 6R','2026-11-21 青森 4R'
 ]);
});

test('ineligible historical results are excluded',()=>{
 const rows=[
  row('2026-11-20 青森 1R','2026-11-20T09:00:00Z',{eligible:false}),
  row('2026-11-20 青森 2R','2026-11-20T09:00:00Z')
 ];
 assert.deepEqual(Array.from(select(rows),r=>r.id),['2026-11-20 青森 2R']);
});
