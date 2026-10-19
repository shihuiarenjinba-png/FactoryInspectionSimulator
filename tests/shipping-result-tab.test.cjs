"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const app=fs.readFileSync("src/app.js","utf8"),tabs=fs.readFileSync("src/operation-tabs.js","utf8");
test("actual completed inspection and dispatch opens visible results before scrolling",()=>{
 const i=app.indexOf("function submit(){"),j=app.indexOf("function download(",i);
 assert.ok(i>=0&&j>i);
 const body=app.slice(i,j);
 assert.match(body,/E\.advance\(state,plan\(\)\)/);
 assert.match(body,/stage\.dataset\.outcome=report\.lateness>0\?"late":report\.escaped>0\?"quality-risk":"completed"/);
 assert.match(body,/report\.shipped/);assert.match(body,/report\.inspected/);
 assert.match(body,/report\.escaped/);assert.match(body,/report\.lateness/);
 assert.ok(body.indexOf('OperationTabs?.open("run")')<body.indexOf('$("outcome").scrollIntoView('));
 assert.doesNotMatch(body,/if\(report\)\s*E\.advance\(/);
 assert.doesNotThrow(()=>new vm.Script(app));
 assert.match(tabs,/panels":\[2,3\]/);
});
test("dispatch view does not redraw speculative results as a real shipment",()=>{
 assert.match(app,/if\(!report\)\{/);
 assert.match(app,/検査方針を決めて/);
});