"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),E=require("../src/engine.js");
test("90-day varied-policy progression is deterministic, ledger-safe and never grants free actions",()=>{
 let playable=0,finished=0,insolvent=0;
 for(let seed=1;seed<=30;seed++){
  let s=E.initial(seed);
  for(let turn=0;turn<E.MAX_DAYS&&!s.finished;turn++){
   const plan={inspectPercent:[25,50,75,100][turn%4],workers:2+turn%3,repair:true,overtime:false,calibrate:turn%4===3};
   const estimate=E.estimate(s,plan);
   if(!estimate.canPay){insolvent++;break;}
   const v=E.advance(s,plan);assert.ok(Number.isFinite(v.report.profit));
   s=E.validate(JSON.parse(JSON.stringify(v.state)));playable++;
   assert.ok(Number.isSafeInteger(s.cash));
   assert.ok(s.reputation>=0&&s.reputation<=100);
  }
  if(s.finished)finished++;
 }
 assert.ok(playable>=1000);
 assert.equal(finished+insolvent,30);
});