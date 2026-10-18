"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),E=require("../src/engine.js");
const typical={inspectPercent:50,workers:2,repair:true,overtime:false,calibrate:false};
test("same seed and decisions reproduce the exact same production day",()=>{
 const a=E.initial(12345),b=E.initial(12345);
 assert.deepEqual(E.currentOrder(a),E.currentOrder(b));
 assert.deepEqual(E.advance(a,typical),E.advance(b,typical));
});
test("inspection strategy never changes manufactured defect count",()=>{
 const s=E.initial(99);
 const none=E.advance(s,{...typical,inspectPercent:0});
 const full=E.advance(s,{...typical,inspectPercent:100});
 assert.equal(none.report.totalDefects,full.report.totalDefects);
 assert.equal(none.report.escaped,none.report.totalDefects);
 assert.equal(none.report.inspected,0);
 assert.equal(full.report.inspected,full.report.order.units);
 assert.ok(full.report.escaped<=none.report.escaped);
});
test("repair and scrap conserve all manufactured units",()=>{
 for(const repair of [true,false])for(const percent of E.INSPECTION_LEVELS){
  const result=E.advance(E.initial(77),{...typical,repair,inspectPercent:percent});
  const r=result.report;
  assert.equal(r.shipped+r.scrapped,r.order.units);
  assert.equal(r.totalDefects,r.escaped+r.found);
  assert.equal(r.found,r.repaired+r.scrapped);
  assert.ok(r.inspected<=r.order.units);
  assert.ok(r.escaped<=r.shipped);
 }
});
test("cash equals prior cash + revenue - itemized expense exactly",()=>{
 let s=E.initial(22);
 for(let day=0;day<12&&!s.finished;day++){
  const r=E.advance(s,{...typical,inspectPercent:[0,25,50,75,100][day%5],
   workers:1+day%4,calibrate:day%2===0,overtime:day%3===0});
  const c=r.report.costs,subtotal=Object.values(c).reduce((sum,n)=>sum+n,0);
  assert.equal(r.report.expenses,subtotal);
  assert.equal(r.report.profit,r.report.revenue-r.report.expenses);
  assert.equal(r.state.cash,s.cash+r.report.profit);
  assert.equal(r.report.cash,r.state.cash);
  assert.equal(r.state.history.at(-1).cash,r.state.cash);
  s=r.state;
 }
});
test("quality inspection has a real staffing/late-delivery tradeoff",()=>{
 const s=E.initial(44);
 const fast=E.estimate(s,{...typical,inspectPercent:100,workers:4});
 const slow=E.estimate(s,{...typical,inspectPercent:100,workers:1});
 assert.ok(slow.expectedMinutes>fast.expectedMinutes);
 assert.ok(fast.baseCost>slow.baseCost);
 const r1=E.advance(s,{...typical,inspectPercent:100,workers:1});
 const r4=E.advance(s,{...typical,inspectPercent:100,workers:4});
 assert.ok(r1.report.duration>r4.report.duration);
 assert.equal(r1.report.totalDefects,r4.report.totalDefects);
});
test("no automatic quality pass, zero inspected reveals no defects",()=>{
 const s=E.initial(7),r=E.advance(s,{...typical,inspectPercent:0});
 assert.equal(r.report.found,0);
 assert.equal(r.report.repaired,0);
 assert.equal(r.report.falseAlerts,0);
 assert.equal(r.report.escaped,r.report.totalDefects);
});
test("expensive operations fail safely while an affordable fallback remains possible",()=>{
 const risky={inspectPercent:100,workers:1,repair:true,overtime:false,calibrate:false};
 const s=E.advance(E.initial(5),risky).state;
 assert.ok(!s.finished&&s.cash>0&&s.cash<100000,"legitimate low-cash scenario");
 const before=JSON.stringify(s),costly={inspectPercent:100,workers:4,repair:true,overtime:true,calibrate:true};
 assert.throws(()=>E.advance(s,costly),/資金/);
 assert.equal(JSON.stringify(s),before);
 const affordable=E.advance(s,{inspectPercent:0,workers:1,repair:false,overtime:false,calibrate:false});
 assert.equal(affordable.state.day,s.day+1);
 assert.ok(affordable.state.cash>=0);
});
test("invalid inspection percentage and staff numbers are refused",()=>{
 const s=E.initial(42);
 assert.throws(()=>E.advance(s,{...typical,inspectPercent:33}),/検査率/);
 assert.throws(()=>E.advance(s,{...typical,workers:0}),/workers/);
 assert.throws(()=>E.advance(s,{...typical,workers:5}),/workers/);
 assert.throws(()=>E.advance(s,{...typical,repair:"yes"}),/不正/);
});
test("corrupted saved histories, cash ledgers, and finished flags fail closed",()=>{
 const s=E.advance(E.initial(321),typical).state;
 const changed=JSON.parse(JSON.stringify(s));changed.cash+=1;
 assert.throws(()=>E.validate(changed),/一致/);
 const total=JSON.parse(JSON.stringify(s));total.totalDelivered+=1;
 assert.throws(()=>E.validate(total),/累計/);
 const bad=JSON.parse(JSON.stringify(s));bad.history[0].day=7;
 assert.throws(()=>E.validate(bad),/順序/);
 const flag=JSON.parse(JSON.stringify(s));flag.finished=true;
 assert.throws(()=>E.validate(flag),/終了/);
});
test("day-by-day decisions preserve original object and deterministic replay",()=>{
 let a=E.initial(345),b=E.initial(345);
 for(let day=1;day<=30;day++){
  if(a.finished)break;
  const p={...typical,inspectPercent:E.INSPECTION_LEVELS[(day+2)%5],workers:1+day%4,repair:day%3!==0,calibrate:day%5===0,overtime:day%4===0};
  const before=JSON.stringify(a),x=E.advance(a,p),y=E.advance(b,p);
  assert.deepEqual(x,y);assert.equal(JSON.stringify(a),before);
  assert.equal(x.state.day,day+1);
  assert.equal(x.state.history.length,day);
  a=x.state;b=y.state;
 }
});
test("UI-facing order hides exact manufactured defects",()=>{
 const order=E.currentOrder(E.initial());
 assert.ok(order.riskHint);
 assert.ok(!Object.hasOwn(order,"actualDefects"));
});

test("forged initial funds, first-day profits, or continued bankruptcy cannot load",()=>{
 const fresh=E.initial();
 const forgery={...fresh,cash:fresh.cash+10000};
 assert.throws(()=>E.validate(forgery),/初期残高/);
 const day2=E.advance(fresh,typical).state;
 const forgedLedger=JSON.parse(JSON.stringify(day2));forgedLedger.history[0].profit+=10000;
 assert.throws(()=>E.validate(forgedLedger),/初日の現金台帳/);
});

test("unable-to-operate bankruptcy or 90-day completion ends cleanly",()=>{
 const overInspect={inspectPercent:100,workers:1,repair:true,overtime:false,calibrate:false};
 const result=E.advance(E.initial(30),overInspect).state;
 assert.equal(result.finished,true);
 assert.equal(E.validate(result).finished,true);
 assert.throws(()=>E.advance(result,overInspect),/営業終了/);
});

test("multiple inspection policies can be optimal on different lots, not one hard-coded winner",()=>{
 const policies=[
  {inspectPercent:0,workers:1,repair:true,overtime:false,calibrate:false},
  {inspectPercent:25,workers:2,repair:true,overtime:false,calibrate:false},
  {inspectPercent:50,workers:2,repair:true,overtime:false,calibrate:false},
  {inspectPercent:75,workers:3,repair:true,overtime:false,calibrate:false},
  {inspectPercent:100,workers:4,repair:true,overtime:false,calibrate:false},
  {inspectPercent:100,workers:3,repair:true,overtime:false,calibrate:true}
 ];
 const winners=new Set();
 for(let seed=1;seed<=120;seed++){
  const s=E.initial(seed);
  const profits=policies.map(p=>E.advance(s,p).report.profit);
  winners.add(profits.indexOf(Math.max(...profits)));
 }
 assert.ok(winners.size>=4,"pricing, speed, quality and calibration must produce meaningful policy tradeoffs");
});

test("ninety-day stress across different policies always ends or offers an affordable fallback",()=>{
 const fallback={inspectPercent:0,workers:1,repair:false,overtime:false,calibrate:false};
 const policies=[
  {...fallback},
  {inspectPercent:50,workers:2,repair:true,overtime:false,calibrate:false},
  {inspectPercent:100,workers:4,repair:true,overtime:false,calibrate:false},
  {inspectPercent:100,workers:1,repair:true,overtime:false,calibrate:false}
 ];
 for(const policy of policies)for(let seed=1;seed<=8;seed++){
  let s=E.initial(seed),days=0;
  while(!s.finished){
   const chosen=E.estimate(s,policy).canPay?policy:fallback;
   assert.ok(E.estimate(s,chosen).canPay,"low-cash player must have a safe next action");
   const result=E.advance(s,chosen);
   assert.equal(result.report.shipped+result.report.scrapped,result.report.order.units);
   assert.equal(result.state.cash,s.cash+result.report.profit);
   assert.deepEqual(E.validate(result.state),result.state);
   s=result.state;days++;assert.ok(days<=E.MAX_DAYS);
  }
  assert.ok(s.day===E.MAX_DAYS+1 || s.cash<E.POLICY.overhead+E.POLICY.wagePerWorker);
 }
});
