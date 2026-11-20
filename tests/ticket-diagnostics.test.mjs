import test from "node:test";
import assert from "node:assert/strict";
import {ticketDiagnostics} from "../src/ticket-diagnostics.mjs";
const base={riderIds:[1,2,3,4,5],winningTrio:"1-2-3",lines:[[1,2],[3,4,5]],odds:{"1-2-3":4.5}};
test("every ticket has both win and loss analysis",()=>{
 const result=ticketDiagnostics({...base,tickets:["1-2-3","1-2-4"]});
 assert.equal(result.length,2);
 for(const item of result){assert.ok(item.winFactors.length>0);assert.ok(item.lossFactors.length>0);assert.equal(item.causalCertainty,"not_established");}
});
test("hit is order independent",()=>assert.equal(ticketDiagnostics({...base,tickets:["3-1-2"]})[0].hit,true));
test("miss records matched and missing riders",()=>{const x=ticketDiagnostics({...base,tickets:["1-2-4"]})[0];assert.deepEqual(x.matchingRiders,[1,2]);assert.deepEqual(x.missingRiders,[4]);});
test("unknown odds remain null",()=>assert.equal(ticketDiagnostics({...base,tickets:["1-3-4"]})[0].observedFactors.quotedOdds,null));
