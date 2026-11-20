import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {Script} from "node:vm";
const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
test("PWA has one inline application script",()=>{assert.equal((html.match(/<script(?:\s[^>]*)?>/g)||[]).length,1);});
test("complete inline PWA JavaScript parses",()=>{
 const match=html.match(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/);
 assert.ok(match,"inline application script missing");
 assert.doesNotThrow(()=>new Script(match[1],{filename:"index.html:inline-script"}));
});
test("no change to three-bet purchase contract",()=>{
 assert.match(html,/const BUY=Object\.freeze\(\{yen:100,min:1,max:3,minRiders:5,maxRiders:9\}\)/);
});
