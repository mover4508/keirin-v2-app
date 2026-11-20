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

test("settlement evaluator rejects fractional, unsafe, or non-ten-yen payouts",()=>{
 for(const payout of [740.5,741,Number.MAX_SAFE_INTEGER+1,-10,NaN,Infinity])
  assert.throws(()=>evaluateTickets(ids,["1-2-3"],"1-2-3",payout),/invalid payout/);
 assert.equal(evaluateTickets(ids,["1-2-3"],"1-2-3",740).returnsYen,740);
});

test("chronological split rejects malformed rows before sorting",()=>{
 assert.throws(()=>chronologicalSplit(null,1,1),/invalid chronological rows/);
 assert.throws(()=>chronologicalSplit({},1,1),/invalid chronological rows/);
 assert.throws(()=>chronologicalSplit([],Number.MAX_SAFE_INTEGER+1,1),/invalid split size/);
 for(const bad of [null,undefined,42,"invalid",[]]){
  const result=chronologicalSplit([{predictionTimestamp:"2026-01-01T00:00:00Z",beforeDeadline:true},bad],1,1);
  assert.equal(result.eligible,false);
  assert.equal(result.reason,"invalid_rows");
 }
});

test("missing or malformed rider lists fail closed without crashing",()=>{
 for(const riders of [null,undefined,{},42,"1234567"]){
  const result=validateTickets(riders,["1-2-3"]);
  assert.equal(result.ok,false);
  assert.ok(result.errors.includes("invalid_riders"));
  assert.throws(()=>evaluateTickets(riders,["1-2-3"],"1-2-3",740),/invalid tickets/);
 }
});

test("payout evaluator matches official result monetary bounds",()=>{
 for(const payout of [0,10,90,100000010])
  assert.throws(()=>evaluateTickets(ids,["1-2-3"],"1-2-3",payout),/invalid payout/);
 for(const payout of [100,100000000])
  assert.equal(evaluateTickets(ids,["1-2-3"],"1-2-3",payout).returnsYen,payout);
});

test("rider identifiers must be actual one-digit numbers or numeric strings",()=>{
 for(const invalid of [true,false,null,undefined,"", "01", "1.0", {}, []]){
  const riders=[invalid,2,3,4,5,6,7];
  const result=validateTickets(riders,["1-2-3"]);
  assert.equal(result.ok,false,String(invalid));
  assert.ok(result.errors.includes("invalid_riders"),String(invalid));
 }
 assert.equal(validateTickets(["1","2","3","4","5","6","7"],["1-2-3"]).ok,true);
});

test("trio arrays reject implicit numeric coercion",()=>{
 for(const ticket of [[true,2,3],[null,2,3],["01",2,3],["",2,3],[{},2,3],[[1],2,3]])
  assert.equal(normalizeTrio(ticket),null,JSON.stringify(ticket));
 assert.equal(normalizeTrio(["3",1,2]),"1-2-3");
 assert.equal(normalizeTrio([3,1,2]),"1-2-3");
});

test("trio strings must contain only three rider IDs and supported separators",()=>{
 for(const invalid of ["abc1-2-3","1-2-3xyz","(1-2-3)","1-2-3-","01-2-3","1.2.3",null,undefined,123])
  assert.equal(normalizeTrio(invalid),null,String(invalid));
 for(const valid of ["1-2-3","1－2－3","1 2 3","1,2,3","1/2/3"])
  assert.equal(normalizeTrio(valid),"1-2-3",valid);
});

test("candidate and baseline must use comparable validation sample counts",()=>{
 const baseline={sampleSize:70,hitRate:0.3,roi:0.6};
 const candidate={sampleSize:69,hitRate:0.4,roi:0.8,changedTickets:8};
 assert.equal(adoptionGate(baseline,candidate).reason,"incomparable_validation_samples");
 assert.equal(adoptionGate(baseline,{...candidate,sampleSize:71}).reason,"incomparable_validation_samples");
 assert.equal(adoptionGate(baseline,{...candidate,sampleSize:70}).reason,"requires_prospective_confirmation");
});
