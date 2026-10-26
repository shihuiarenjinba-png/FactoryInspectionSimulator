"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),E=require("../src/engine.js");
const src=fs.readFileSync("src/app.js","utf8");
const begin=src.indexOf("function outcomeView(){"),end=src.indexOf("function historyView(){",begin);
assert.ok(begin>0&&end>begin,"result view must be present");
const outcomeSource=src.slice(begin,end);
const basic=E.advance(E.initial(73),{inspectPercent:50,workers:2,repair:true,overtime:false,calibrate:false}).report;
function advice(overrides){
 const report={...basic,...overrides};
 const root={children:[],replaceChildren(){this.children=[];},append(child){this.children.push(child)}};
 const create=(tag,text,cls)=>({tag,textContent:text||"",cls,children:[],append(...c){this.children.push(...c)}});
 const source='const $=id=>root, yen=n=>n+"円";\n'+
  'const appendPair=(container,name,value)=>container.append(create("div",name+": "+value,"datum"));\n'+
  outcomeSource+'\noutcomeView();';
 const render=new Function("report","root","create",source);
 render(report,root,create);
 const message=root.children.filter(x=>x.textContent.startsWith("次の改善："));
 assert.equal(message.length,1);
 return message[0].textContent;
}
test("late and escaped inspections explain both issues without a one-dimensional recommendation",()=>{
 assert.match(advice({escaped:2,lateness:12}),/見逃しと納期超過/);
});
test("missed defects prompt an inspection and repair policy review",()=>{
 assert.match(advice({escaped:3,lateness:0}),/検査率/);
});
test("late delivery prompts staffing/time comparison",()=>{
 assert.match(advice({escaped:0,lateness:45}),/人員/);
});
test("safe but loss-making batch prompts cost review",()=>{
 assert.match(advice({escaped:0,lateness:0,profit:-1500}),/赤字/);
});
test("profitable good batch retains forward-looking business guidance",()=>{
 assert.match(advice({escaped:0,lateness:0,profit:2000}),/信用/);
});
