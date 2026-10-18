"use strict";const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const src=fs.readFileSync("src/operation-tabs.js","utf8");
test("real order screen leads to quality station, then actual dispatch/settlement",()=>{
 assert.match(src,/orders":\["quality"/);
 assert.match(src,/quality":\["run"/);
 assert.match(src,/run":\["orders"/);
 assert.match(src,/details":".records"/);
 assert.match(src,/button\.addEventListener\("click",\(\)=>open\(to\)\)/);
 assert.doesNotMatch(src,/localStorage|\.cash\s*=|\.reputation\s*=/);
 assert.doesNotThrow(()=>new vm.Script(src));
});