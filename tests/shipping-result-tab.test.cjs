"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const app=fs.readFileSync("src/app.js","utf8"),tabs=fs.readFileSync("src/operation-tabs.js","utf8");
test("shipping finishes calculations, then reveals the correct report tab",()=>{
 const i=app.indexOf("function submit(){"),j=app.indexOf("function download(",i);
 assert.ok(i>=0&&j>i);
 const body=app.slice(i,j);
 assert.match(body,/E\.advance\(state,plan\(\)\)/);
 assert.match(body,/report=next\.report/);
 assert.match(body,/syncResultScene\(\)/);
 assert.ok(body.indexOf('OperationTabs?.open("run")')<body.indexOf('$("outcome").scrollIntoView('));
 assert.doesNotMatch(body,/if\(report\)\s*E\.advance\(/);
 assert.doesNotThrow(()=>new vm.Script(app));
 assert.match(tabs,/panels":\[2,3\]/);
});
test("context picture never displays stale dispatch stats after new game or import",()=>{
 const a=app.indexOf("function syncResultScene(){"),b=app.indexOf("function redraw(){",a);
 assert.ok(a>0&&b>a);
 const caption={textContent:""},stage={dataset:{},querySelector:()=>caption};
 const document={querySelector:()=>stage};
 const fn=new Function("document","getReport",app.slice(a,b).replace(
   "function syncResultScene(){","function syncResultScene(){const report=getReport();")+"return syncResultScene;");
 let report={shipped:120,inspected:80,escaped:3,lateness:4};
 const sync=fn(document,()=>report);
 sync();assert.equal(stage.dataset.outcome,"late");
 assert.match(caption.textContent,/出荷 120個/);
 report=null;sync();
 assert.equal(stage.dataset.outcome,"pending");
 assert.doesNotMatch(caption.textContent,/出荷 120個/);
 assert.match(caption.textContent,/出荷前です/);
 assert.match(app,/function redraw\(\)\{[^}]*syncResultScene\(\)/);
});
