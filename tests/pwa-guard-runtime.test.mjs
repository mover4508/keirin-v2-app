import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";

const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
const start=html.indexOf("  // Hard fail before writing any new prediction.");
const end=html.indexOf("  const drafts={...db.drafts};",start);
assert.ok(start>=0&&end>start,"prediction guard not found");
const guard=html.slice(start,end);
const BUY={yen:100,min:1,max:3,minRiders:5,maxRiders:9};
const riders=[1,2,3,4,5,6,7];
function check(keys,ids=riders){
 const context={input:{ids},record:{tickets:keys.map(key=>({key}))},BUY,Error,Number,Set,String};
 return runInNewContext(`(()=>{${guard}return true})()`,context);
}
test("valid one to three canonical trio tickets pass",()=>{
 for(const keys of [["1-2-3"],["1-2-3","2-4-5"],["1-2-3","2-4-5","3-6-7"]])
  assert.equal(check(keys),true);
});
test("reject zero and four tickets",()=>{
 for(const keys of [[],["1-2-3","1-2-4","1-2-5","1-2-6"]])
  assert.throws(()=>check(keys),/不整合/);
});
test("reject duplicated, unsorted and nonstarter tickets",()=>{
 for(const keys of [["1-1-2"],["3-1-2"],["1-2-9"],["1-2-3","1-2-3"],["1-2"]])
  assert.throws(()=>check(keys),/不整合/);
});
test("reject invalid rider sets",()=>{
 for(const ids of [[1,2,3,4],[1,2,3,4,5,6,7,8,9,10],[1,2,3,4,4],[1,2,3,4,5,6,6]])
  assert.throws(()=>check(["1-2-3"],ids),/不整合/);
});
