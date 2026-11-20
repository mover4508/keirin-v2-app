import * as vmModule from "node:vm";
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
test("self-audit is present in the PWA",()=>{assert.match(html,/id="runSafetyAudit"/);assert.match(html,/function runSafetySelfAudit\(/);});
test("self-audit is read-only",()=>{const match=html.match(/function runSafetySelfAudit\(\)\{([\s\S]*?)\n\}/);assert.ok(match);assert.doesNotMatch(match[1],/writeStored|commit|localStorage\.setItem|saveDrive|fetch\(/);});
test("fixed trio purchase rules remain intact",()=>assert.match(html,/yen:100,min:1,max:3,minRiders:5,maxRiders:9/));
test("app keeps three race divisions",()=>assert.match(html,/const divisions=\["堅め","標準","荒れ"\]/));

test("dataset audit counts forward evidence separately",()=>{assert.match(html,/settled\.filter\(confirmedForward\)/);assert.match(html,/前向き予測の精度実績として扱いません/);});
test("dataset audit reports all three regimes",()=>{assert.match(html,/divisionsCount=\[0,0,0\]/);assert.match(html,/raceSignals\(r\.input,PARAMS\)\.regime/);});
test("dataset audit remains read-only",()=>{const match=html.match(/function runSafetySelfAudit\(\)\{([\s\S]*?)\n\}/);assert.ok(match);assert.doesNotMatch(match[1],/writeStored|localStorage\.setItem|saveDrive|persist\(/);});

test("audit reports each rider-count bucket",()=>{assert.match(html,/\[5,6,7,8,9\]\.map/);assert.match(html,/byRiders\.get\(n\)/);});
test("audit reports grade distribution",()=>{assert.match(html,/byGrade\.set\(grade/);assert.match(html,/グレード別/);});

test("Drive audit displays last verified receipt",()=>{assert.match(html,/lastDriveReceipt\?\.savedAt/);assert.match(html,/Drive保存の最終確認/);});
test("Drive audit warns on possible unsynced records",()=>{assert.match(html,/lastDriveReceipt\.races<all\.length/);assert.match(html,/再接続してバックアップしてください/);});

test("read-only audit imports parameter and ticket safety modules",()=>{
 assert.match(html,/async function runModuleSafetyAudit\(\)/);
 assert.match(html,/import\("\.\/src\/parameter-guard\.mjs"\)/);
 assert.match(html,/import\("\.\/src\/safety-gates\.mjs"\)/);
 assert.match(html,/validateParameters\(activeConfig\(\)\.params\)/);
 assert.match(html,/validateTickets\(record\.input\.ids,record\.tickets\.map\(t=>t\.key\)\)/);
});
test("independent audit does not write local data",()=>{
 const block=html.split("async function runModuleSafetyAudit(){")[1]?.split('setupMobileApp();')[0];
 assert.ok(block);
 assert.doesNotMatch(block,/\bpersist\(|\bwriteStored\(|localStorage\.setItem\(|\bbackup\(/);
});

test("audit counts all default and editable parameters",()=>{
 assert.match(html,/const configurable=Object\.keys\(fields\),defaults=Object\.keys\(PARAMS\)/);
 assert.match(html,/defaults\.filter\(key=>!Object\.hasOwn\(fields,key\)\)/);
 assert.match(html,/設定変数の監査/);
});

test("prediction validates ticket contract before persistence",()=>{
 const begin=html.indexOf("async function submitPrediction(");
 const end=html.indexOf("const correction=",begin);
 const code=html.slice(begin,end);
 assert.ok(begin>=0&&end>begin);
 assert.match(code,/const riderIds=new Set\(input\.ids\.map\(Number\)\)/);
 assert.match(code,/ticketKeys\.some\(key=>!canonical\(key\)\)/);
 assert.match(code,/new Set\(ticketKeys\)\.size!==ticketKeys\.length/);
 assert.ok(code.indexOf("throw Error(\"予想の組番")<code.indexOf("await persist("));
});

test("prospective metrics exclude retrospective and voided races",()=>{
 assert.match(html,/const forwardEligible=forward\.filter\(r=>!r\.settlement\.voided/);
 assert.match(html,/const forwardHits=forwardEligible\.filter/);
 assert.match(html,/const forwardStake=forwardEligible\.reduce/);
 assert.match(html,/const forwardPayout=forwardEligible\.reduce/);
 assert.match(html,/過去記録を前向き精度として表示しません/);
});

test("prospective ROI includes refund amounts in returned stake",()=>{
 assert.match(html,/const forwardRefund=forwardEligible\.reduce/);
 assert.match(html,/r\.settlement\.refundYen\?\?0/);
 assert.match(html,/const forwardReturn=forwardPayout\+forwardRefund/);
 assert.match(html,/forwardReturn\/forwardStake/);
});

test("prospective validation warns when below configured minimum",()=>{
 assert.match(html,/const minimumProspective=activeConfig\(\)\.params\.validationMinimum/);
 assert.match(html,/forwardEligible\.length<minimumProspective/);
 assert.match(html,/改善候補の採用判断にはデータ不足です/);
 assert.match(html,/統計的判定の確認前に自動採用しません/);
});

test("prospective ROI requires internally consistent financial records",()=>{
 assert.match(html,/r\.tickets\.length>=BUY\.min&&r\.tickets\.length<=BUY\.max/);
 assert.match(html,/Number\.isFinite\(r\.settlement\.payout\)/);
 assert.match(html,/Number\.isFinite\(r\.settlement\.refundYen\)/);
 assert.match(html,/r\.settlement\.stake===r\.tickets\.length\*BUY\.yen/);
});

test("independent parameter validation gates candidate settings persistence",()=>{
 const start=html.indexOf('$("saveSettings").onclick=');
 const end=html.indexOf('$("resetSettings").onclick=',start);
 assert.ok(start>=0&&end>start);
 const code=html.slice(start,end);
 assert.match(code,/import\("\.\/src\/parameter-guard\.mjs"\)/);
 assert.match(code,/validateParameters\(\{\.\.\.PARAMS,\.\.\.values\}\)/);
 assert.match(code,/if\(!checked\.ok\)throw Error/);
 assert.ok(code.indexOf("if(!checked.ok)")<code.indexOf("saveConfigRevision("));
});

test("prospective ROI excludes inconsistent or negative financial records",()=>{
 assert.match(html,/r\.settlement\.payout>=0/);
 assert.match(html,/r\.settlement\.refundYen>=0/);
 assert.match(html,/r\.settlement\.refundYen<=r\.settlement\.stake/);
 assert.match(html,/r\.settlement\.payout===r\.tickets\.reduce/);
});

test("PWA safety audit invokes bounded meta-loop without adopting proposals",()=>{
 assert.match(html,/async function runMetaLoopSafetyAudit\(\)/);
 assert.match(html,/import\("\.\/src\/meta-loop\.mjs"\)/);
 assert.match(html,/candidates:\[\],iteration:0,limits:\{maxCandidates:12,maxIterations:10\}/);
 assert.match(html,/dryRun\.requiresHumanOrGovernedRelease===true/);
 assert.match(html,/void runMetaLoopSafetyAudit\(\)/);
});

test("unsettled race is explicitly pending, never a loss",()=>{
 const review=html.slice(html.indexOf("function showReview(r){"),html.indexOf("function performanceTotals("));
 assert.match(review,/if\(!r\.settlement\)/);
 assert.match(review,/結果待ち：結果表の照合が完了するまで的中・不的中を判定しません/);
 assert.ok(review.indexOf("if(!r.settlement)")<review.indexOf("const judged="));
 assert.match(html,/!settlement\?"結果待ち":settlement\.voided\?"中止・不成立"/);
});

test("previously settled same-race record is labeled as reused, not a new prediction",()=>{
 assert.match(html,/existing\.settlement\?/);
 assert.match(html,/過去に結果照合済みの保存記録です。新規予想ではありません/);
 assert.match(html,/以前の照合結果を表示しています/);
 assert.match(html,/結果表は未照合のため、判定は結果待ちです/);
});

test("offline PWA caches and serves safety modules",()=>{
 const sw=readFileSync(new URL("../sw.js",import.meta.url),"utf8");
 for(const name of ["parameter-guard","safety-gates","ticket-diagnostics","meta-loop"])
   assert.ok(sw.includes("./src/"+name+".mjs"),name+" must be precached");
 assert.match(sw,/\.\.\.modules\]\.map\(url => new Request/);
 assert.match(sw,/modules\.includes\(url\.href\)/);
 assert.match(sw,/keirin-v2\.4\.12\.1/);
});

test("prediction panel clearly distinguishes settled saved records from pending predictions",()=>{
 const panel=html.slice(html.indexOf("function showPrediction(record){"),html.indexOf("function showReview(r){"));
 assert.match(panel,/if\(record\.settlement\)/);
 assert.match(panel,/過去の保存予想であり、新たに予想した買い目ではありません/);
 assert.match(panel,/結果表が未照合です。的中・不的中は確定していません/);
});

test("all configurable PARAMS are represented in settings fields",()=>{
 const defaults=html.match(/const PARAMS=Object\.freeze\(\{([\s\S]*?)\}\);/);
 const controls=html.match(/const fields=\{([\s\S]*?)\n\};/);
 assert.ok(defaults&&controls);
 const paramNames=[...defaults[1].matchAll(/(?:^|[,\n])\s*([A-Za-z][A-Za-z0-9]*)\s*:/g)].map(m=>m[1]);
 const fieldNames=[...controls[1].matchAll(/^\s*([A-Za-z][A-Za-z0-9]*)\s*:/gm)].map(m=>m[1]);
 assert.ok(paramNames.length>=30,"parameter inventory should be complete");
 assert.deepEqual(paramNames.filter(k=>!fieldNames.includes(k)),[],"unexposed parameters");
 assert.deepEqual(fieldNames.filter(k=>!paramNames.includes(k)),[],"orphaned settings fields");
});

test("integrity failure suppresses financial and prospective statistics",()=>{
 const audit=html.slice(html.indexOf("function makeIntegrityAudit(){"),html.indexOf('$("auditExport").onclick'));
 assert.match(audit,/validateBackup\(db\)/);
 assert.match(audit,/if\(report\.status==="fail"\)/);
 for(const name of ["totalStake","totalReturned","net","recoveryRate"])
  assert.match(audit,new RegExp("report\\."+name+"=null"));
 assert.match(audit,/report\.forwardOnly=\{status:"unavailable",reason:"record_integrity_failed"\}/);
});

test("saved result originals must be reparseable for a passing integrity audit",()=>{
 const validation=html.slice(html.indexOf("function validateSettlement(r,validKey){"),html.indexOf("function validateBackup(incoming){"));
 assert.match(validation,/restored=parseResult\(s\.raw,r\.input\.ids\)/);
 assert.match(validation,/identity=raceIdentity\(s\.raw\)/);
 assert.match(validation,/保存済み結果表の原文を再検証できません/);
 assert.doesNotMatch(validation,/catch\s*\{\s*\}/);
 assert.match(validation,/if\(identity\.id!==r\.id\)/);
});

test("offline installation verifies PNG signatures only for icon responses",()=>{
 const sw=readFileSync(new URL("../sw.js",import.meta.url),"utf8");
 assert.match(sw,/const requests = \[index, \.\.\.assets, \.\.\.modules\]/);
 assert.match(sw,/for \(const response of responses\.slice\(2, 4\)\)/);
 assert.doesNotMatch(sw,/for \(const response of responses\.slice\(2\)\)/);
});

test("official result parsing and backup validation agree on payout units and bounds",()=>{
 const parser=html.slice(html.indexOf("function parseResult(text,ids){"),html.indexOf("async function persist("));
 const validator=html.slice(html.indexOf("function validateSettlement(r,validKey){"),html.indexOf("function validateBackup(incoming){"));
 assert.match(parser,/payout%10!==0/);
 assert.match(parser,/payout>100000000/);
 assert.match(validator,/w\.payout<=100000000&&w\.payout%10===0/);
});

test("insufficient evidence does not forcibly reduce two or three auto-selected tickets",()=>{
 const block=html.slice(html.indexOf("function reviewAdditionalTickets("),html.indexOf("function marketComparison("));
 assert.match(block,/if\(rank<0\)\{checks\.push\(\{key,status:"odds",n:0\}\);return \{count:keys\.length,checks,reason:"insufficient_evidence"\};\}/);
 assert.match(block,/if\(sample\.length<params\.expectedMinimum\)\{checks\.push\(\{\.\.\.detail,status:"sample"\}\);return \{count:keys\.length,checks,reason:"insufficient_evidence"\};\}/);
 assert.match(block,/if\(!pass\)break;/);
});

test("Ver.2 maintains 36 engines across three regimes and supports 1, 2, 3 ticket decisions",()=>{
 const vm=requireVm();
 const start=html.indexOf("const families=[");
 const end=html.indexOf("const averages=",start);
 assert.ok(start>=0&&end>start);
 const source=html.slice(start,end);
 const sizes=vm.runInNewContext("const ENGINE_SIZE=12;"+source+";({families:families.length,regimes:regimes.length,engineCount:allEngines({minLineWeight:1}).length,ids:allEngines({minLineWeight:1}).map(e=>e.id)})");
 assert.equal(sizes.families,12);
 assert.equal(sizes.regimes,3);
 assert.equal(sizes.engineCount,36);
 assert.deepEqual(Array.from(sizes.ids),Array.from({length:36},(_,i)=>i+1));
 const pstart=html.indexOf("function countForGaps("),pend=html.indexOf("function wilsonLower(",pstart);
 assert.ok(pstart>=0&&pend>pstart);
 const count=vm.runInNewContext("const BUY={max:3};"+html.slice(pstart,pend)+";countForGaps");
 assert.equal(count({firstGap:.2,secondGap:0},{firstGap:.1,secondGap:.075}),1);
 assert.equal(count({firstGap:.05,secondGap:.1},{firstGap:.1,secondGap:.075}),2);
 assert.equal(count({firstGap:.05,secondGap:.02},{firstGap:.1,secondGap:.075}),3);
});
function requireVm(){return vmModule;}
