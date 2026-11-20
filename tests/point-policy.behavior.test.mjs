// Execute the production point policy directly, not a reimplementation of its logic.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const start=html.indexOf('function automaticPointPolicy(');
const end=html.indexOf('function wilsonLower(',start);
assert.ok(start>=0&&end>start,'Production point policy source was not found');
const source=html.slice(start,end);
const BUY=Object.freeze({yen:100,min:1,max:3,minRiders:5,maxRiders:9});
const policy=Object.freeze({version:1,id:'standard',firstGap:.10,secondGap:.075});
const context={BUY,POINT_POLICY:policy,Number};
runInNewContext(source,context);
const score=(...values)=>values.map((value,i)=>({key:String(i),score:value}));
const choose=(ranking,p=policy)=>context.automaticPointPolicy(ranking,p).count;

test('missing, NaN and unordered scores never reduce tickets',()=>{
 for(const ranking of [
  score(.8,.7),score(.8,.7,NaN),score(.8,null,.6),
  score(.8,.9,.6),score(.8,.6,.7),[]
 ]){
  assert.equal(choose(ranking,{...policy,firstGap:0,secondGap:0}),3);
 }
});

test('valid ordered score gaps select one, two, or three tickets',()=>{
 assert.equal(choose(score(.9,.7,.65)),1);
 assert.equal(choose(score(.9,.85,.7)),2);
 assert.equal(choose(score(.9,.85,.82)),3);
});

test('ticket counts always respect the fixed 1–3 range',()=>{
 for(let a=0;a<=10;a++)for(let b=0;b<=a;b++)for(let c=0;c<=b;c++){
  const count=choose(score(a/10,b/10,c/10));
  assert.ok(Number.isInteger(count)&&count>=BUY.min&&count<=BUY.max);
 }
});
