import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const section=(start,end)=>{const a=html.indexOf(start),b=html.indexOf(end,a);assert.ok(a>=0&&b>a);return html.slice(a,b)};
const submit=section('async function submitPrediction(','const correction=');
const paste=section('async function consumePaste(','pasteOnly("entry"');
const descend=section('function descends(','async function drive(');
test('settled records are immutable and unsettled records can be recalculated',()=>{
 assert.match(submit,/if\(db\.records\[id\]\?\.settlement\)return/);
 assert.match(paste,/if\(!existing\.settlement\)/);
 assert.match(paste,/await submitPrediction\(race,draft\)/);
});
test('new odds are parsed, and a missing race card or odds are rejected',()=>{
 assert.match(paste,/const odds=isOdds\?raw:/);
 assert.match(paste,/if\(!odds\)throw Error/);
 assert.match(paste,/if\(!entry\)throw Error/);
 assert.match(paste,/readRiders\(source\.raw\)/);
});
test('old prediction and odds survive each new forecast',()=>{
 assert.match(submit,/record\.previousPrediction=prior/);
 assert.match(submit,/record\.predictionRevisions=/);
 assert.match(submit,/odds:prior\.input\.odds/);
 assert.match(descend,/newer\.previousPrediction/);
});
