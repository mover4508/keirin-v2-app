import test from "node:test";
import assert from "node:assert/strict";
import {evaluateImprovementCycle,categorizeImprovements} from "../src/meta-loop.mjs";
const baseline={sampleSize:70,hitRate:.3,roi:.6};
const better={sampleSize:70,hitRate:.4,roi:.7,changedTickets:10};
test("candidate is evaluated but never automatically adopted",()=>{const x=evaluateImprovementCycle({baseline,candidates:[{id:"a",metrics:better}]});assert.equal(x.evaluations[0].adopt,false);assert.equal(x.evaluations[0].reason,"requires_prospective_confirmation");});
test("iteration limit stops the loop",()=>{const x=evaluateImprovementCycle({baseline,candidates:[],iteration:10});assert.equal(x.status,"stopped");});
test("candidate budget limits work",()=>{const x=evaluateImprovementCycle({baseline,candidates:Array.from({length:20},(_,i)=>({id:i,metrics:better})),limits:{maxCandidates:3}});assert.equal(x.evaluations.length,3);assert.equal(x.reason,"candidate_budget");});
test("unknown category becomes repair proposal",()=>{const x=categorizeImprovements([{id:"x",category:"unknown",reason:"test"}]);assert.equal(x[0].category,"直す");assert.equal(x[0].status,"proposal_only");});
test("no hidden side effect in original baseline",()=>{const b={...baseline};evaluateImprovementCycle({baseline:b,candidates:[{metrics:better}]});assert.deepEqual(b,baseline);});

test("invalid meta-loop budgets cannot bypass termination guards",()=>{
 for(const bad of [NaN,Infinity,-1,0,1.5,"unlimited"]){
  assert.throws(()=>evaluateImprovementCycle({baseline,candidates:[],limits:{maxIterations:bad}}),/invalid budget/);
  assert.throws(()=>evaluateImprovementCycle({baseline,candidates:[],limits:{maxCandidates:bad}}),/invalid budget/);
 }
 assert.throws(()=>evaluateImprovementCycle({baseline,candidates:[],limits:null}),/invalid limits/);
});
test("oversized finite budgets are capped",()=>{
 const x=evaluateImprovementCycle({baseline,candidates:[],iteration:1000,limits:{maxIterations:1000000}});
 assert.equal(x.status,"stopped");
});

test("malformed candidate and issue records are rejected without partial evaluation",()=>{
 for(const item of [null,undefined,42,"invalid",[]]){
  assert.throws(()=>evaluateImprovementCycle({baseline,candidates:[item]}),/invalid candidate/);
  assert.throws(()=>categorizeImprovements([item]),/invalid issue/);
 }
 assert.throws(()=>evaluateImprovementCycle({baseline,candidates:[],iteration:Number.MAX_SAFE_INTEGER+1}),/invalid iteration/);
});

test("trio-only and fixed purchase rules cannot be altered by improvement proposals",()=>{
 for(const fixedRules of [
  {betType:"trifecta"},{stakeYen:200},{minTickets:0},{maxTickets:4},
  {minRiders:4},{maxRiders:10},{unknownSetting:true}
 ]){
  const result=evaluateImprovementCycle({baseline,candidates:[{id:"unsafe",fixedRules,metrics:better}]});
  assert.equal(result.evaluations[0].adopt,false);
  assert.equal(result.evaluations[0].reason,"fixed_rules_violation");
 }
 const allowed=evaluateImprovementCycle({baseline,candidates:[{fixedRules:{betType:"trio",stakeYen:100},metrics:better}]});
 assert.equal(allowed.evaluations[0].reason,"requires_prospective_confirmation");
 for(const invalid of [null,[],42])
  assert.throws(()=>evaluateImprovementCycle({baseline,candidates:[{fixedRules:invalid,metrics:better}]}),/invalid fixed rules proposal/);
});
