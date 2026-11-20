/* Ver.2: pure, side-effect-free safety checks for prediction and evaluation.
   This module never reads local storage, network, or result data to form predictions. */
export const FIXED_RULES = Object.freeze({betType:"trio",stakeYen:100,minTickets:1,maxTickets:3,minRiders:5,maxRiders:9,allowRaceSkip:false});
export function normalizeTrio(ticket){
  if(!Array.isArray(ticket)&&(typeof ticket!=="string"||!/^[1-9](?:[\s,、/／\-－–ー=＝]+[1-9]){2}$/.test(ticket.trim())))return null;
  const parts=Array.isArray(ticket)?ticket:ticket.trim().split(/[\s,、/／\-－–ー=＝]+/);
  if(parts.length!==3)return null;
  if(parts.some(n=>!(typeof n==="number"&&Number.isInteger(n)||typeof n==="string"&&/^[1-9]$/.test(n))))return null;
  const nums=parts.map(Number);
  if(nums.some(n=>!Number.isInteger(n)||n<1||n>9)||new Set(nums).size!==3)return null;
  return nums.sort((a,b)=>a-b).join("-");
}
export function validateTickets(riderIds,tickets){
  const validRiders=Array.isArray(riderIds);
  const riderList=validRiders?riderIds:[];
  const ids=new Set(riderList.map(Number));
  const errors=[];
  if(!validRiders||riderList.some(n=>!(typeof n==="number"&&Number.isInteger(n)||typeof n==="string"&&/^[1-9]$/.test(n)))||ids.size!==riderList.length||ids.size<5||ids.size>9||[...ids].some(n=>!Number.isInteger(n)||n<1||n>9))errors.push("invalid_riders");
  if(!Array.isArray(tickets)||tickets.length<1||tickets.length>3)errors.push("invalid_ticket_count");
  const normalized=(Array.isArray(tickets)?tickets:[]).map(normalizeTrio);
  if(normalized.some(t=>!t))errors.push("invalid_trio");
  if(new Set(normalized).size!==normalized.length)errors.push("duplicate_trio");
  for(const t of normalized){if(t&&t.split("-").some(n=>!ids.has(Number(n))))errors.push("nonstarter_trio");}
  return {ok:errors.length===0,errors:[...new Set(errors)],tickets:normalized,stakeYen:normalized.length*100};
}
export function evaluateTickets(riderIds,tickets,finishTrio,payoutYen){
  const checked=validateTickets(riderIds,tickets);
  if(!checked.ok)throw new Error("invalid tickets: "+checked.errors.join(","));
  const winner=normalizeTrio(finishTrio);
  if(!winner||winner.split("-").some(n=>!riderIds.map(Number).includes(Number(n))))throw new Error("invalid finish trio");
  if(!Number.isSafeInteger(payoutYen)||payoutYen<100||payoutYen>100000000||payoutYen%10!==0)throw new Error("invalid payout");
  const hits=checked.tickets.map(t=>t===winner);
  const returnsYen=hits.some(Boolean)?payoutYen:0;
  return {tickets:checked.tickets,winningTrio:winner,hits,hit:hits.some(Boolean),stakeYen:checked.stakeYen,returnsYen,profitYen:returnsYen-checked.stakeYen};
}
export function chronologicalSplit(rows,trainMin=30,validationMin=20){
  if(!Array.isArray(rows))throw new Error("invalid chronological rows");
  if(!Number.isSafeInteger(trainMin)||trainMin<1||!Number.isSafeInteger(validationMin)||validationMin<1)throw new Error("invalid split size");
  if(rows.some(row=>!row||typeof row!=="object"||Array.isArray(row)))
    return {eligible:false,reason:"invalid_rows",train:[],validation:[]};
  const ordered=rows.map((row,index)=>({row,index})).sort((a,b)=>{
    const at=Date.parse(a.row.predictionTimestamp??""),bt=Date.parse(b.row.predictionTimestamp??"");
    return (Number.isFinite(at)?at:Infinity)-(Number.isFinite(bt)?bt:Infinity)||a.index-b.index;
  });
  if(ordered.length<trainMin+validationMin)return {eligible:false,reason:"insufficient_data",train:[],validation:[]};
  if(ordered.some(x=>!Number.isFinite(Date.parse(x.row.predictionTimestamp??""))||x.row.beforeDeadline!==true))return {eligible:false,reason:"unverified_pre_race",train:[],validation:[]};
  const raceIds=ordered.map(x=>x.row.raceId).filter(id=>id!==undefined&&id!==null);
  if(raceIds.some(id=>!(typeof id==="string"&&id.trim()!==""||typeof id==="number"&&Number.isSafeInteger(id))))
    return {eligible:false,reason:"invalid_race_ids",train:[],validation:[]};
  if(new Set(raceIds.map(String)).size!==raceIds.length)
    return {eligible:false,reason:"duplicate_race_ids",train:[],validation:[]};
  const cutoff=ordered.length-validationMin;
  const train=ordered.slice(0,cutoff).map(x=>x.row),validation=ordered.slice(cutoff).map(x=>x.row);
  if(Date.parse(train.at(-1).predictionTimestamp)>=Date.parse(validation[0].predictionTimestamp))return {eligible:false,reason:"overlapping_timestamps",train:[],validation:[]};
  return {eligible:true,reason:null,train,validation};
}
export function adoptionGate(baseline,candidate,{minimumValidation=50,minimumChanged=5}={}){
  const nums=[baseline?.sampleSize,candidate?.sampleSize,baseline?.hitRate,candidate?.hitRate,baseline?.roi,candidate?.roi,candidate?.changedTickets];
  if(nums.some(v=>!Number.isFinite(v)))return {adopt:false,reason:"missing_metrics"};
  if(!Number.isSafeInteger(minimumValidation)||minimumValidation<1||
     !Number.isSafeInteger(minimumChanged)||minimumChanged<1||
     !Number.isSafeInteger(baseline.sampleSize)||baseline.sampleSize<0||
     !Number.isSafeInteger(candidate.sampleSize)||candidate.sampleSize<0||
     !Number.isSafeInteger(candidate.changedTickets)||candidate.changedTickets<0||
     candidate.changedTickets>candidate.sampleSize||
     baseline.hitRate<0||baseline.hitRate>1||candidate.hitRate<0||candidate.hitRate>1||
     baseline.roi<0||candidate.roi<0)return {adopt:false,reason:"invalid_metrics"};
  if(baseline.sampleSize!==candidate.sampleSize)return {adopt:false,reason:"incomparable_validation_samples"};
  if(baseline.sampleSize<minimumValidation||candidate.sampleSize<minimumValidation)return {adopt:false,reason:"insufficient_validation"};
  if(candidate.changedTickets<minimumChanged)return {adopt:false,reason:"insufficient_changes"};
  if(candidate.hitRate<baseline.hitRate||candidate.roi<baseline.roi)return {adopt:false,reason:"regression"};
  if(candidate.hitRate===baseline.hitRate&&candidate.roi===baseline.roi)return {adopt:false,reason:"no_improvement"};
  return {adopt:false,reason:"requires_prospective_confirmation"}; // No automated production adoption from retrospective comparisons.
}
