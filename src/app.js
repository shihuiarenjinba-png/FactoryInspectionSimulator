/* Factory Inspection Simulator — simple player UI, no external resources. */
(function(){"use strict";
const E=globalThis.FactoryInspection,$=id=>document.getElementById(id),KEY="factory-inspection:save:v1";
let state=null,report=null,recoveryBlocked=false,unreadableRaw=null,notice="";
const yen=x=>Math.round(x).toLocaleString("ja-JP")+"円";
const create=(tag,txt,cls)=>{const n=document.createElement(tag);if(txt!==undefined)n.textContent=txt;if(cls)n.className=cls;return n;};
function load(){
 let raw=null;
 try{raw=localStorage.getItem(KEY);return raw?E.validate(JSON.parse(raw)):E.initial();}
 catch(err){recoveryBlocked=true;unreadableRaw=raw;notice="保存された進行を読み込めませんでした。元データは上書きしていません。";return E.initial();}
}
function persist(){
 if(recoveryBlocked)return false;
 try{localStorage.setItem(KEY,JSON.stringify(state));return true;}
 catch(err){notice="自動保存に失敗しました。記録の書き出しをお試しください。";return false;}
}
function plan(){return {inspectPercent:Number($("inspectPercent").value),workers:Number($("workers").value),
 repair:$("repair").checked,overtime:$("overtime").checked,calibrate:$("calibrate").checked};}
function appendPair(container,name,value){const row=create("div",undefined,"datum");row.append(create("small",name),create("strong",value));container.append(row);}
function orderView(){
 const root=$("order");root.replaceChildren();
 if(state.finished){root.append(create("p","経営期間が終了しました。セーブ管理から新しいゲームを始められます。","muted"));return;}
 const o=E.currentOrder(state),stats=create("div",undefined,"order-grid");
 for(const [key,val] of [["製造品",o.name],["受注数量",o.units+"個"],["1個の売上",yen(o.unitPrice)],["納期の目安",o.deadline+"分"],["不良の可能性",o.riskHint]])appendPair(stats,key,val);
 root.append(stats);
 root.append(create("p","抜き取り検査では、不良品の総数は分かりません。全数検査でも見逃しが起こり得ます。","muted"));
}
function outcomeView(){
 const root=$("outcome");root.replaceChildren();
 if(!report){root.append(create("p","まずは検査方針を決めて、今日のラインを動かしましょう。","muted"));return;}
 const grid=create("div",undefined,"result-grid");
 for(const [key,val] of [["検査した部品",report.inspected+"個"],["発見した不良",report.found+"個"],["見逃した不良",report.escaped+"個"],
 ["出荷数",report.shipped+"個"],["所要時間",report.duration+"分"],["納期の超過",report.lateness+"分"],
 ["本日の売上",yen(report.revenue)],["本日の利益",yen(report.profit)]])appendPair(grid,key,val);
 root.append(grid);
 const accounting=create("p", "検査・人件費・修理・補償・遅延を含む総費用："+yen(report.expenses)+"。期末資金："+yen(report.cash)+"。","muted");
 root.append(accounting);
 for(const n of report.notes)root.append(create("p",n,"feedback"));
 const advice=report.escaped>0&&report.lateness>0?
  "次の改善：見逃しと納期超過の両方が発生しました。検査率だけを増やさず、人員・修理方針・予想時間を合わせて比較しましょう。":
  report.escaped>0?
  "次の改善：見逃し不良が発生しました。検査率を上げるか、修理方針と事前の資金を見直しましょう。":
  report.lateness>0?
  "次の改善：納期を超過しました。比較表で検査率・人員・予想作業時間を見比べましょう。":
  report.profit<0?
  "次の改善：品質と納期を守れても赤字です。検査費・人件費と売上を比較し、過剰な費用がないか見直しましょう。":
  "次の改善：品質と納期を守れました。次は固定費を抑えつつ、継続して信用を積み重ねられるか試しましょう。";
 root.append(create("p",advice,"feedback"));
 if(report.escaped===0&&report.lateness===0)root.append(create("p","不良品の見逃しを抑え、納期内に出荷できました。次は利益とのバランスを考えましょう。","positive"));
}
function historyView(){
 const root=$("history");root.replaceChildren();
 if(!state.history.length){root.append(create("p","営業すると、利益・不良品・顧客信用の記録が残ります。","muted"));return;}
 for(const h of state.history.slice(-12).reverse()){
  const line=create("div",h.day+"日目 ｜ 利益 "+yen(h.profit)+" ｜ 出荷 "+h.delivered+"個 ｜ 見逃し "+h.escaped+"個 ｜ 信用 "+h.reputation,"history-item");
  root.append(line);
 }
}
function overview(){
 $("day").textContent=state.finished?"終了（"+(state.day-1)+"日）":state.day+"日目";
 $("cash").textContent=yen(state.cash);
 $("reputation").textContent=state.reputation+" / 100";
 $("shipments").textContent=state.totalDelivered.toLocaleString("ja-JP")+"個";
}
function milestoneView(){
 const node=$("milestone");
 if(state.finished){
  node.textContent=state.day>E.MAX_DAYS?
   "90日間の運営を完走！ 出荷 "+state.totalDelivered.toLocaleString("ja-JP")+"個、最終信用 "+state.reputation+"。":
   "工場の経営はここで終了。"+(state.day-1)+"日間の判断を振り返り、次の挑戦に活かしましょう。";
  return;
 }
 const levels=[
  {units:500,trust:0,title:"最初の500個を出荷しよう"},
  {units:2000,trust:50,title:"累計2000個を出荷し、顧客の信用を50以上に"},
  {units:5000,trust:70,title:"累計5000個と信用70を両立しよう"},
  {units:9000,trust:80,title:"累計9000個と信用80を目指そう"}
 ];
 const goal=levels.find(g=>state.totalDelivered<g.units||state.reputation<g.trust);
 node.textContent=goal?"次の経営目標："+goal.title+" ｜ 現在 "+state.totalDelivered.toLocaleString("ja-JP")+"個・信用 "+state.reputation:
  "主要目標を達成！ あとは90日間の経営を守り抜こう。現在 "+state.totalDelivered.toLocaleString("ja-JP")+"個・信用 "+state.reputation;
}
function comparisonView(){
 const root=$("comparison");root.replaceChildren();
 if(recoveryBlocked||state.finished){root.append(create("p","セーブの復旧・経営終了時は比較できません。","muted"));return;}
 try{
  const selected=plan(),table=create("table");
  const head=create("thead"),headRow=create("tr");
  for(const title of ["検査率","検査数","予想時間","固定的費用","資金"]){headRow.append(create("th",title));}
  head.append(headRow);table.append(head);
  const body=create("tbody");
  for(const percent of E.INSPECTION_LEVELS){
   const estimate=E.estimate(state,{...selected,inspectPercent:percent});
   const tr=create("tr",undefined,percent===selected.inspectPercent?"selected-row":"");
   for(const value of [percent+"%",estimate.samples+"個",estimate.expectedMinutes+"分",yen(estimate.baseCost),estimate.canPay?"可能":"不足"])tr.append(create("td",value));
   body.append(tr);
  }
  table.append(body);root.append(table);
 }catch(error){root.append(create("p",error.message,"muted"));}
}

function lineView(estimate,error){
 const root=$("lineVizContent");root.replaceChildren();
 if(!estimate){root.append(create("p",error||"検査方針を選択してください。","line-viz-foot warning"));return;}
 const grid=create("div",undefined,"line-viz-grid");
 function meter(title,detail,value,max,late){
  const card=create("div",undefined,"line-meter"+(late?" late":""));
  const header=create("div",undefined,"line-meter-head");
  header.append(create("span",title),create("strong",detail));card.append(header);
  const progress=create("progress");progress.max=Math.max(1,max);progress.value=Math.max(0,Math.min(max,value));
  progress.setAttribute("aria-label",title+" "+detail);card.append(progress);grid.append(card);
 }
 meter("検査する製品",estimate.samples+" / "+estimate.order.units+"個",estimate.samples,estimate.order.units,false);
 meter("予想作業時間",estimate.expectedMinutes+" / 納期"+estimate.deadline+"分",
   estimate.expectedMinutes,estimate.deadline,estimate.expectedLate);
 root.append(grid);
 root.append(create("p","予想固定費 "+yen(estimate.baseCost)+
  " ｜ "+(estimate.expectedLate?"今の計画は納期超過の見込み。人員・検査率の変更を検討してください。":
  "現時点では納期内の見込み。実際の不良数や補償費は未確定です。"),
  "line-viz-foot"+(estimate.expectedLate?" warning":"")));
}

function preflight(){
 const root=$("preview");root.className="preview";root.replaceChildren();
 if(recoveryBlocked){
  root.classList.add("error");
  root.append(create("strong","元のセーブを保護しています。"));
  root.append(create("p",unreadableRaw!==null?
    "下の「セーブ管理」から元データを書き出し、正常なセーブを読み込むか、新規開始してください。":
    "端末の保存機能にアクセスできません。設定を確認するか、確認のうえ新規開始してください。"));
  lineView(null,"セーブの復元後にラインを操作できます。");$("run").disabled=true;return;
 }
 if(state.finished){
  root.append(create("p",state.day<=E.MAX_DAYS?"最低限の運営資金が不足し、工場の営業が終了しました。":"90日間の経営を完走しました。"));
  lineView(null,"経営が終了したため、検査ラインは停止しています。");$("run").disabled=true;return;
 }
 try{
  const a=E.estimate(state,plan());
  lineView(a);if(!a.canPay)throw Error("固定費を支払える資金が不足しています。");
  const severity=a.expectedLate?"この計画では納期遅れの可能性があります。":"この計画は納期内の見込みですが、実際の時間は不良品の発見数で変化します。";
  root.append(create("p","検査予定："+a.samples+" / "+a.order.units+"個 ｜ 所要時間の予想："+a.expectedMinutes+"分（納期 "+a.deadline+"分）"));
  root.append(create("p","検査・人件費等の固定的費用："+yen(a.baseCost)+" ｜ "+severity));
  root.append(create("p","修理費・返品対応費・納期遅れの費用は検査結果によって増減します。","subtle"));
  $("run").disabled=false;
 }catch(err){lineView(null,err.message);root.classList.add("error");root.append(create("p",err.message));$("run").disabled=true;}
}
function syncResultScene(){
 const stage=document.querySelector('.context-scene[data-scene-key="run"]');
 if(!stage)return;
 const caption=stage.querySelector(".context-description p");
 if(!report){
  stage.dataset.outcome="pending";
  if(caption)caption.textContent="出荷前です。注文・検査方針を決めてから実行してください。";
  return;
 }
 stage.dataset.outcome=report.lateness>0?"late":report.escaped>0?"quality-risk":"completed";
 if(caption)caption.textContent="実績：出荷 "+report.shipped+"個、検査 "+report.inspected+
  "個、見逃し "+report.escaped+"個、遅延 "+report.lateness+"分。計算済みの出荷結果です。";
}
function redraw(){overview();milestoneView();orderView();outcomeView();historyView();preflight();comparisonView();syncResultScene();}
function submit(){
 if(recoveryBlocked||state.finished)return;
 try{
  const next=E.advance(state,plan());
  // A production day must not advance unless its report and ledger are saved.
  localStorage.setItem(KEY,JSON.stringify(next.state));
  state=next.state;report=next.report;
  notice=next.report.escaped||next.report.lateness?"品質・納期の結果を確認して、次の改善を考えましょう。":"納期と品質を両立できました。利益の改善も考えましょう。";
  redraw();
  syncResultScene();
  globalThis.OperationTabs?.open("run");
  $("outcome").scrollIntoView({behavior:"smooth",block:"nearest"});
 }catch(err){notice=err.message;preflight();$("preview").prepend(create("p",notice,"error-text"));}
}
function download(name,text){
 const url=URL.createObjectURL(new Blob([text],{type:"application/json"})),a=create("a");
 a.href=url;a.download=name;document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function exportSave(){
 if(recoveryBlocked&&unreadableRaw===null){alert("この端末から元の保存データを取得できません。");return;}
 download(recoveryBlocked?"factory-inspection-unreadable-original.json":"factory-inspection-day-"+state.day+".json",
  recoveryBlocked?unreadableRaw:JSON.stringify({schema:E.VERSION,state},null,2));
}
async function importSave(file){
 if(!file)return;
 try{
  if(file.size>400000)throw Error("セーブデータが大きすぎます。");
  const data=JSON.parse(await file.text());
  if(data.schema!==E.VERSION)throw Error("対応していないセーブ形式です。");
  const incoming=E.validate(data.state);
  if(!confirm("現在の進行状況を読み込んだセーブで置き換えますか？"))return;
  localStorage.setItem(KEY,JSON.stringify(incoming));
  state=incoming;report=null;recoveryBlocked=false;unreadableRaw=null;notice="記録を読み込みました。";
  redraw();
 }catch(err){alert("セーブ読込に失敗しました："+err.message);}
}
function init(){
 state=load();if(!recoveryBlocked)persist();redraw();
 const presets={policyBudget:{percent:25,workers:1},policyStandard:{percent:50,workers:2},
  policyQuality:{percent:100,workers:4}};
 for(const [id,policy] of Object.entries(presets))$(id).addEventListener("click",()=>{
  if(recoveryBlocked||state.finished)return;
  $("inspectPercent").value=String(policy.percent);$("workers").value=String(policy.workers);
  preflight();comparisonView();
 });
 for(const id of ["inspectPercent","workers","repair","overtime","calibrate"])$(id).addEventListener("change",()=>{preflight();comparisonView();});
 $("run").addEventListener("click",submit);
 $("export").addEventListener("click",exportSave);
 $("import").addEventListener("click",()=>$("savefile").click());
 $("savefile").addEventListener("change",event=>{const f=event.target.files[0];event.target.value="";void importSave(f);});
 $("reset").addEventListener("click",()=>{
  const warning=recoveryBlocked?
   "元のセーブを上書きして新規開始します。先に元データを書き出しましたか？":
   "現在の進行を上書きして初日から始めます。よろしいですか？";
  if(!confirm(warning))return;
  try{
   const next=E.initial();
   localStorage.setItem(KEY,JSON.stringify(next));
   state=next;report=null;recoveryBlocked=false;unreadableRaw=null;notice="新しく始めました。";
   redraw();
  }catch(error){notice="保存できないため、現在の工場データは変更しませんでした。";redraw();}
 });
}
document.addEventListener("DOMContentLoaded",init);
})();