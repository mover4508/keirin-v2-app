const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync('index.html','utf8');
const source = html.match(/function ticketStakeRisk\(input,keys\)\{[\s\S]*?\n\}/)?.[0];
assert.ok(source,'ticketStakeRisk source must exist');
const context = vm.createContext({BUY:{yen:100}});
const risk = vm.runInContext(source+'\nticketStakeRisk',context);
const keys=['1-2-3','1-2-4','1-3-4'];
let result = risk({odds:{'1-2-3':2.5,'1-2-4':5,'1-3-4':8}},keys);
assert.equal(result.stake,300);
assert.equal(result.scenarios[0].netIfOnlyHit,-50);
assert.equal(result.lossOnSingleHit.length,1);
result = risk({odds:{'1-2-3':3,'1-2-4':3.1,'1-3-4':3.2}},keys);
assert.equal(result.lossOnSingleHit.length,0);
for(const missing of [undefined,null,'',0,'n/a']){
  result = risk({odds:{'1-2-3':missing}},['1-2-3']);
  assert.equal(result.missingOdds.length,1);
  assert.equal(result.scenarios[0].netIfOnlyHit,null);
}
console.log('Ticket stake risk checks passed');
