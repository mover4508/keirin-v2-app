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
