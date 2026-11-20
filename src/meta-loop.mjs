// Bounded improvement cycles. This module evaluates proposals but never mutates the app or deploys.
import {adoptionGate,FIXED_RULES} from "./safety-gates.mjs";
export function evaluateImprovementCycle({baseline,candidates,iteration=0,limits={}}){
 if(!limits||typeof limits!=="object"||Array.isArray(limits))throw new Error("invalid limits");
 const budget=(value,fallback,maximum)=>{
  const selected=value??fallback;
  if(!Number.isSafeInteger(selected)||selected<1)throw new Error("invalid budget");
  return Math.min(maximum,selected);
 };
 const maxCandidates=budget(limits.maxCandidates,12,100);
 const maxIterations=budget(limits.maxIterations,10,1000);
 if(!Number.isSafeInteger(iteration)||iteration<0)throw new Error("invalid iteration");
 if(!Array.isArray(candidates))throw new Error("invalid candidates");
 if(iteration>=maxIterations)return {status:"stopped",reason:"iteration_budget",iteration,evaluations:[]};
 const evaluations=candidates.slice(0,maxCandidates).map((candidate,index)=>{
  if(!candidate||typeof candidate!=="object"||Array.isArray(candidate))throw new Error("invalid candidate");
  const changes=candidate.fixedRules;
  if(changes!==undefined){
   if(!changes||typeof changes!=="object"||Array.isArray(changes))
    throw new Error("invalid fixed rules proposal");
   if(Object.entries(changes).some(([key,value])=>!(key in FIXED_RULES)||FIXED_RULES[key]!==value))
    return {index,id:String(candidate.id??index),adopt:false,reason:"fixed_rules_violation",metrics:candidate.metrics??null};
  }
  const verdict=adoptionGate(baseline,candidate.metrics??{});
  return {index,id:String(candidate.id??index),adopt:false,reason:verdict.reason,metrics:candidate.metrics??null};
 });
 return {status:"evaluated",reason:candidates.length>maxCandidates?"candidate_budget":null,
  iteration:iteration+1,evaluations,requiresHumanOrGovernedRelease:true};
}
export function categorizeImprovements(issues){
 const allowed=new Set(["必要","増やす","直す","調整","削除"]);
 if(!Array.isArray(issues))throw new Error("invalid issues");
 return issues.map((item,index)=>{
  if(!item||typeof item!=="object"||Array.isArray(item))throw new Error("invalid issue");
  return ({
  id:String(item.id??index),category:allowed.has(item.category)?item.category:"直す",
  reason:String(item.reason??"根拠未記載"),status:"proposal_only"
 });
 });
}
