import test from "node:test";
import assert from "node:assert/strict";
import {normalizeTrio,validateTickets,evaluateTickets,chronologicalSplit,adoptionGate} from "../src/safety-gates.mjs";
const ids=[1,2,3,4,5,6,7];
test("trio normalization is order-independent",()=>assert.equal(normalizeTrio("7-1-3"),"1-3-7"));
test("duplicate rider in trio rejected",()=>assert.equal(normalizeTrio("1-1-2"),null));
test("valid 3 tickets cost 300 yen",()=>{const x=validateTickets(ids,["1-2-3","1-2-4","1-3-4"]);assert.equal(x.ok,true);assert.equal(x.stakeYen,300);});
test("duplicate tickets rejected",()=>assert.equal(validateTickets(ids,["1-2-3","3-2-1"]).ok,false));
test("nonstarter rejected",()=>assert.equal(validateTickets(ids,["1-2-8"]).ok,false));
test("more than 3 tickets rejected",()=>assert.equal(validateTickets(ids,["1-2-3","1-2-4","1-3-4","2-3-4"]).ok,false));
test("winner pays once",()=>{const x=evaluateTickets(ids,["1-2-3","1-2-4"],"3-2-1",740);assert.equal(x.hit,true);assert.equal(x.profitYen,540);});
test("miss loses stake",()=>assert.equal(evaluateTickets(ids,["1-2-3"],"1-2-4",740).profitYen,-100));
test("unverified pre-race data not accepted",()=>{const rows=Array.from({length:4},(_,i)=>({predictionTimestamp:new Date(2026,0,i+1).toISOString(),beforeDeadline:false}));assert.equal(chronologicalSplit(rows,2,2).eligible,false);});
test("verified chronological split",()=>{const rows=Array.from({length:4},(_,i)=>({predictionTimestamp:new Date(2026,0,i+1).toISOString(),beforeDeadline:true}));const x=chronologicalSplit(rows,2,2);assert.equal(x.eligible,true);assert.equal(x.train.length,2);});
test("retrospective improvements never auto-adopt",()=>assert.equal(adoptionGate({sampleSize:70,hitRate:.3,roi:.6},{sampleSize:70,hitRate:.4,roi:.7,changedTickets:8}).adopt,false));
test("regression rejected",()=>assert.equal(adoptionGate({sampleSize:70,hitRate:.3,roi:.6},{sampleSize:70,hitRate:.2,roi:.7,changedTickets:8}).reason,"regression"));

test("impossible adoption metrics are rejected explicitly",()=>{
 const base={sampleSize:70,hitRate:.3,roi:.6};
 const candidate={sampleSize:70,hitRate:.4,roi:.7,changedTickets:8};
 for(const changed of [
  {hitRate:1.2},{hitRate:-.1},{roi:-.2},{sampleSize:70.5},
  {changedTickets:71},{changedTickets:-1},{changedTickets:3.5}
 ]){
  assert.equal(adoptionGate(base,{...candidate,...changed}).reason,"invalid_metrics");
 }
 assert.equal(adoptionGate({...base,roi:-1},candidate).reason,"invalid_metrics");
 assert.equal(adoptionGate(base,candidate,{minimumValidation:0}).reason,"invalid_metrics");
 assert.equal(adoptionGate(base,candidate,{minimumChanged:Infinity}).reason,"invalid_metrics");
});
