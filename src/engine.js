/* Factory Inspection Simulator — original deterministic batch-quality game model. */
(function(root,factory) {
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  else root.FactoryInspection=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
"use strict";
const VERSION=1,MAX_DAYS=90;
const PRODUCTS=Object.freeze([
 {id:"board",name:"電子部品の基板",price:3600,defectPenalty:9900,baseRisk:.065},
 {id:"valve",name:"精密バルブ",price:6100,defectPenalty:14850,baseRisk:.095},
 {id:"toy",name:"玩具の可動部品",price:2700,defectPenalty:8250,baseRisk:.085},
 {id:"package",name:"食品包装材",price:3200,defectPenalty:12100,baseRisk:.075}
]);
const INSPECTION_LEVELS=Object.freeze([0,25,50,75,100]);
const POLICY=Object.freeze({baseCash:800000,overhead:18500,wagePerWorker:18000,inspectCost:450,
 repairCost:840,calibrationCost:18000,falseAlarmCost:230,lateCostPerMinute:3500,maxWorkers:4});
const integer=(n,name,min,max)=>{if(!Number.isSafeInteger(n)||n<min||n>max)throw Error(name+"は"+min+"から"+max+"の整数にしてください。");return n;};
function hash(seed,day,index,salt){
 let x=(seed ^ Math.imul(day,0x9e3779b1) ^ Math.imul(index+1,0x85ebca6b) ^ Math.imul(salt,0xc2b2ae35))>>>0;
 x^=x>>>16;x=Math.imul(x,0x7feb352d);x^=x>>>15;x=Math.imul(x,0x846ca68b);x^=x>>>16;
 return(x>>>0)/4294967296;
}
function initial(seed=20261018){
 integer(seed,"seed",1,2147483647);
 return {version:VERSION,seed,day:1,cash:POLICY.baseCash,reputation:65,
  totalDelivered:0,totalEscaped:0,history:[],finished:false};
}
function validate(raw){
 if(!raw||raw.version!==VERSION||!Array.isArray(raw.history)||raw.history.length>MAX_DAYS)throw Error("保存形式を読み取れません。");
 const x={version:VERSION,seed:integer(raw.seed,"seed",1,2147483647),
 day:integer(raw.day,"day",1,MAX_DAYS+1),cash:integer(raw.cash,"cash",-1000000000,10000000000),
 reputation:integer(raw.reputation,"reputation",0,100),
 totalDelivered:integer(raw.totalDelivered,"totalDelivered",0,1000000),
 totalEscaped:integer(raw.totalEscaped,"totalEscaped",0,1000000),history:[],finished:raw.finished};
 if(typeof raw.finished!=="boolean"||raw.history.length!==raw.day-1)throw Error("日付または営業状態が不正です。");
 let delivered=0,escaped=0;
 raw.history.forEach((v,i)=>{
  if(!v||v.day!==i+1)throw Error("営業記録の順序が不正です。");
  const rec={day:v.day,profit:integer(v.profit,"profit",-1e9,1e10),
   cash:integer(v.cash,"cash",-1e9,1e10),
   delivered:integer(v.delivered,"delivered",0,1000),
   escaped:integer(v.escaped,"escaped",0,1000),
   reputation:integer(v.reputation,"reputation",0,100)};
  if(i&&v.cash!==raw.history[i-1].cash+v.profit)throw Error("収支台帳の整合性が不正です。");
  delivered+=v.delivered;escaped+=v.escaped;x.history.push(rec);
 });
 if(x.history.length===0 && (x.cash!==POLICY.baseCash||x.reputation!==65))throw Error("初期残高・信用度が不正です。");
 if(x.history.length && x.history[0].cash!==POLICY.baseCash+x.history[0].profit)throw Error("初日の現金台帳が不正です。");
 for(let i=0;i<x.history.length-1;i++)if(x.history[i].cash<POLICY.overhead+POLICY.wagePerWorker)throw Error("資金不足で終了した履歴を継続できません。");
 if(delivered!==x.totalDelivered||escaped!==x.totalEscaped)throw Error("累計の出荷記録が不正です。");
 if(x.history.length&&(x.history.at(-1).cash!==x.cash||x.history.at(-1).reputation!==x.reputation))throw Error("期末残高・評判が履歴と一致しません。");
 if(x.finished!==((x.day>MAX_DAYS)||x.cash<POLICY.overhead+POLICY.wagePerWorker))throw Error("営業終了状態が不正です。");
 return x;
}
function currentOrder(state){
 const s=validate(state);if(s.finished)throw Error("このセーブは営業終了しています。");
 const kind=PRODUCTS[Math.floor(hash(s.seed,s.day,2,1)*PRODUCTS.length)];
 const units=70+Math.floor(hash(s.seed,s.day,3,2)*81);
 const latentRisk=Math.min(.23,kind.baseRisk+(.11*hash(s.seed,s.day,4,3)-.035));
 const deadline=170+Math.floor(hash(s.seed,s.day,5,4)*125);
 const premium=.55+s.reputation/400;
 const unitPrice=Math.round(kind.price*premium/50)*50;
 const riskHint=latentRisk<.085?"やや低い":latentRisk<.14?"通常":"やや高い";
 return {day:s.day,id:kind.id,name:kind.name,units,deadline,unitPrice,
  riskHint,penaltyPerDefect:kind.defectPenalty,
  // Internal manufacturing model; exact defect risk is not disclosed in UI.
  _latentRisk:latentRisk};
}
function validatePlan(plan){
 if(!plan||!INSPECTION_LEVELS.includes(plan.inspectPercent))throw Error("検査率は0・25・50・75・100%から選んでください。");
 if(typeof plan.repair!=="boolean"||typeof plan.overtime!=="boolean"||typeof plan.calibrate!=="boolean")throw Error("作業の設定が不正です。");
 return {inspectPercent:plan.inspectPercent,workers:integer(plan.workers,"workers",1,POLICY.maxWorkers),
  repair:plan.repair,overtime:plan.overtime,calibrate:plan.calibrate};
}
function estimate(raw,p){
 const s=validate(raw),order=currentOrder(s),plan=validatePlan(p);
 const samples=Math.round(order.units*plan.inspectPercent/100);
 const inspectMinutes=samples*4/plan.workers;
 const expectedFound=samples*order._latentRisk*(plan.calibrate?.97:.86)*(plan.overtime?.95:1);
 const repairMinutes=expectedFound*(plan.repair?13:5)/plan.workers;
 const expectedMinutes=Math.max(1,Math.ceil((42+inspectMinutes+repairMinutes)*(plan.overtime?.76:1)));
 const fixed=POLICY.overhead+POLICY.wagePerWorker*plan.workers+
  (plan.overtime?15000*plan.workers:0)+(plan.calibrate?POLICY.calibrationCost:0)+samples*POLICY.inspectCost;
 return {order,plan,samples,expectedMinutes,deadline:order.deadline,
  baseCost:fixed,availableCash:s.cash,expectedLate:expectedMinutes>order.deadline,
  canPay:s.cash>=fixed};
}
function advance(raw,rawPlan){
 const s=validate(raw),a=estimate(s,rawPlan),p=a.plan,order=a.order,kind=PRODUCTS.find(x=>x.id===order.id);
 if(!a.canPay)throw Error("検査の固定費を支払う資金が足りません。");
 const count=a.samples,ranking=Array.from({length:order.units},(_,i)=>i)
  .sort((a,b)=>hash(s.seed,s.day,a,31)-hash(s.seed,s.day,b,31)||a-b);
 const inspected=new Set(ranking.slice(0,count));
 let actualDefects=0,found=0,escaped=0,repaired=0,scrapped=0,falseAlerts=0,extraWork=0;
 const sensitivity=Math.max(.5,Math.min(.995,(p.calibrate?.97:.85)-(p.overtime?.035:0)));
 for(let i=0;i<order.units;i++){
  const defective=hash(s.seed,s.day,i,73)<order._latentRisk;
  if(defective)actualDefects++;
  if(!inspected.has(i)){if(defective)escaped++;continue;}
  if(defective){
   if(hash(s.seed,s.day,i,74)<sensitivity){
    found++;extraWork+=p.repair?13:5;
    if(p.repair&&hash(s.seed,s.day,i,75)<.965)repaired++;
    else scrapped++;
   }else escaped++;
  }else if(hash(s.seed,s.day,i,76)<.012){falseAlerts++;extraWork+=5;}
 }
 const duration=Math.max(1,Math.ceil((42+(count*4+extraWork)/p.workers)*(p.overtime?.76:1)));
 const lateness=Math.max(0,duration-order.deadline);
 const delivered=order.units-scrapped;
 const revenue=delivered*order.unitPrice;
 const wages=p.workers*POLICY.wagePerWorker+(p.overtime?p.workers*15000:0);
 const claims=escaped*kind.defectPenalty;
 const lateFee=lateness*POLICY.lateCostPerMinute;
 const inspectionCost=count*POLICY.inspectCost;
 const repairCost=repaired*POLICY.repairCost;
 const falseAlertCost=falseAlerts*POLICY.falseAlarmCost;
 const expenses=POLICY.overhead+wages+inspectionCost+repairCost+falseAlertCost+
  (p.calibrate?POLICY.calibrationCost:0)+claims+lateFee;
 const profit=revenue-expenses;
 const cash=s.cash+profit;
 const reputation=Math.max(0,Math.min(100,s.reputation
  + (escaped===0?2:-Math.min(10,Math.ceil(escaped/3)))
  - (lateness>0?Math.min(10,Math.ceil(lateness/25)):0)));
 const finished=s.day===MAX_DAYS||cash<POLICY.overhead+POLICY.wagePerWorker;
 const report={day:s.day,order:{day:order.day,id:order.id,name:order.name,units:order.units,deadline:order.deadline,unitPrice:order.unitPrice,riskHint:order.riskHint},
  plan:p,inspected:count,totalDefects:actualDefects,found,repaired,scrapped,falseAlerts,escaped,
  shipped:delivered,duration,lateness,revenue,expenses,profit,cash,reputation,
  costs:{overhead:POLICY.overhead,wages,inspection:inspectionCost,repair:repairCost,falseAlerts:falseAlertCost,
    calibration:p.calibrate?POLICY.calibrationCost:0,claims,lateFee},
  notes:[
   ...(escaped?["検査をすり抜けた不良品があり、顧客対応費用と信用低下が発生しました。"]:[]),
   ...(lateness?["納期を超過し、遅延費用が発生しました。"]:[]),
   ...(p.inspectPercent===0?["検査を省略しました。費用は減りますが、不良品を発見できません。"]:[]),
   ...(finished?["この経営記録はいったん終了です。新しく始める前に記録を書き出せます。"]:[])
  ]};
 const next={...s,day:s.day+1,cash,reputation,
  totalDelivered:s.totalDelivered+delivered,totalEscaped:s.totalEscaped+escaped,finished,
  history:s.history.concat([{day:s.day,profit,cash,delivered,escaped,reputation}])};
 return {state:validate(next),report};
}
return Object.freeze({VERSION,MAX_DAYS,PRODUCTS,INSPECTION_LEVELS,POLICY,initial,validate,hash,currentOrder,validatePlan,estimate,advance});
});