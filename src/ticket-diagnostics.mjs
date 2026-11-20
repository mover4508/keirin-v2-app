// Evidence-based ticket diagnostics. Descriptive factors are not causal proof.
import {normalizeTrio} from "./safety-gates.mjs";
export function ticketDiagnostics({tickets,winningTrio,riderIds,lines=[],odds={},predictedAt=null,resultRecordedAt=null}){
 if(!Array.isArray(tickets)||!Array.isArray(riderIds))throw new Error("invalid input");
 const winner=normalizeTrio(winningTrio);
 if(!winner)throw new Error("invalid winning trio");
 const winnerSet=new Set(winner.split("-").map(Number));
 const lineGroups=lines.filter(Array.isArray).map(line=>new Set(line.map(Number)));
 return tickets.map(ticket=>{
  const key=normalizeTrio(ticket);
  if(!key)throw new Error("invalid ticket");
  const selected=key.split("-").map(Number);
  if(selected.some(id=>!riderIds.map(Number).includes(id)))throw new Error("nonstarter");
  const matching=selected.filter(id=>winnerSet.has(id));
  const missing=selected.filter(id=>!winnerSet.has(id));
  const hit=key===winner;
  const sameLinePairs=selected.reduce((n,a,i)=>n+selected.slice(i+1).filter(b=>lineGroups.some(line=>line.has(a)&&line.has(b))).length,0);
  const quotedOdds=Number(odds[key]);
  return {
   ticket:key,hit,matchingRiders:matching,missingRiders:missing,
   observedFactors:{matchedCount:matching.length,sameLinePairs,quotedOdds:Number.isFinite(quotedOdds)&&quotedOdds>0?quotedOdds:null},
   winFactors:hit?[{type:"observed",text:"選択した3車が結果の上位3車と一致"}]:[{type:"counterfactual",text:"一致した車番 "+(matching.join("・")||"なし")+" は買い目の部分一致として記録"}],
   lossFactors:hit?[{type:"risk",text:"的中したが再現性や将来の的中を保証しない"}]:[{type:"observed",text:"選択車のうち "+(missing.join("・")||"なし")+" が結果の上位3車に入らず"}],
   evidence:{predictionTimestamp:predictedAt,resultTimestamp:resultRecordedAt},
   causalCertainty:"not_established"
  };
 });
}
