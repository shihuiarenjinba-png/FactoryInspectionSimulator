"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
const engine=require("../src/engine.js");
const source=fs.readFileSync(path.join(__dirname,"../src/app.js"),"utf8");
const ids=["day","cash","reputation","shipments","order","outcome","history","preview",
"inspectPercent","workers","repair","overtime","calibrate","run","export","import","reset","savefile"];
function harness(initialRaw,confirmResult=true){
 const elements={},handlers={},saved=new Map();
 if(initialRaw!==undefined)saved.set("factory-inspection:save:v1",initialRaw);
 class Node{
  constructor(name="div"){
   this.nodeName=name;this.children=[];this.handlers={};this._text="";this.className="";
   this.value="";this.checked=false;this.disabled=false;this.files=[];
   this.classList={add:cls=>{this.className+=(this.className?" ":"")+cls;}};
  }
  set textContent(s){this._text=String(s);this.children=[];}
  get textContent(){return this._text+this.children.map(c=>c.textContent||"").join("");}
  append(...children){this.children.push(...children);}
  prepend(...children){this.children.unshift(...children);}
  replaceChildren(...children){this.children=children;this._text="";}
  addEventListener(type,callback){this.handlers[type]=callback;}
  scrollIntoView(){}
  remove(){}
  click(){if(this.handlers.click)this.handlers.click({target:this});}
 }
 for(const id of ids)elements[id]=new Node(id);
 elements.inspectPercent.value="50";elements.workers.value="2";elements.repair.checked=true;
 const document={
  body:{append(){}},
  getElementById(id){return elements[id]},
  createElement(tag){return new Node(tag)},
  addEventListener(type,callback){handlers[type]=callback}
 };
 let lastDownload=null;
 class FakeBlob{constructor(parts,opts){this.parts=parts;this.opts=opts;}}
 const URL={createObjectURL(blob){lastDownload=blob.parts.join("");return "blob:local";},revokeObjectURL(){}};
 const localStorage={getItem:key=>saved.get(key)??null,setItem:(key,value)=>saved.set(key,value)};
 const context=vm.createContext({FactoryInspection:engine,document,localStorage,URL,Blob:FakeBlob,console,
  confirm:()=>confirmResult,alert:()=>{},setTimeout:()=>{}});
 vm.runInContext(source,context,{filename:"src/app.js"});
 handlers.DOMContentLoaded();
 return {elements,saved,lastDownload:()=>lastDownload,click:id=>elements[id].click(),setConfirmResult(){}};
}
test("first launch and Run button advance a real saved factory day",()=>{
 const h=harness();
 const key="factory-inspection:save:v1";
 assert.equal(JSON.parse(h.saved.get(key)).day,1);
 assert.equal(h.elements.run.disabled,false);
 assert.match(h.elements.preview.textContent,/検査予定/);
 assert.match(h.elements.order.textContent,/受注数量/);
 h.click("run");
 const saved=JSON.parse(h.saved.get(key));
 assert.equal(saved.day,2);
 assert.equal(saved.history.length,1);
 assert.match(h.elements.outcome.textContent,/本日の利益/);
 assert.match(h.elements.history.textContent,/1日目/);
});
test("changing inspection level changes the preview without modifying saved game",()=>{
 const h=harness(),before=h.saved.get("factory-inspection:save:v1");
 h.elements.inspectPercent.value="100";
 h.elements.inspectPercent.handlers.change();
 assert.match(h.elements.preview.textContent,/検査予定/);
 assert.equal(h.saved.get("factory-inspection:save:v1"),before);
 h.elements.inspectPercent.value="33";
 h.elements.inspectPercent.handlers.change();
 assert.equal(h.elements.run.disabled,true);
 assert.match(h.elements.preview.textContent,/検査率/);
});
test("corrupt localStorage is not overwritten by app boot or attempt to run",()=>{
 const bad='{"not":"valid"';
 const h=harness(bad);
 assert.equal(h.saved.get("factory-inspection:save:v1"),bad);
 assert.equal(h.elements.run.disabled,true);
 assert.match(h.elements.preview.textContent,/元のセーブ/);
 h.click("run");
 assert.equal(h.saved.get("factory-inspection:save:v1"),bad);
 h.click("export");
 assert.equal(h.lastDownload(),bad,"export must return the original bytes untouched");
 h.click("reset");
 assert.equal(JSON.parse(h.saved.get("factory-inspection:save:v1")).day,1);
});
test("valid existing save loads without advancing the simulation",()=>{
 const initial=engine.advance(engine.initial(725),{inspectPercent:75,workers:3,repair:true,overtime:false,calibrate:true}).state;
 const serialized=JSON.stringify(initial),h=harness(serialized);
 assert.equal(h.saved.get("factory-inspection:save:v1"),serialized);
 assert.equal(h.elements.day.textContent,"2日目");
 assert.equal(h.elements.reputation.textContent,initial.reputation+" / 100");
});
