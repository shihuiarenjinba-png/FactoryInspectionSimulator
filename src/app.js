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
function preflight(){
 const root=$("preview");root.className="preview";root.replaceChildren();
 if(recoveryBlocked){
  root.classList.add("error");
  root.append(create("strong","元のセーブを保護しています。"));
  root.append(create("p",unreadableRaw!==null?
    "下の「セーブ管理」から元データを書き出し、正常なセーブを読み込むか、新規開始してください。":
    "端末の保存機能にアクセスできません。設定を確認するか、確認のうえ新規開始してください。"));
  $("run").disabled=true;return;
 }
 if(state.finished){
  root.append(create("p",state.cash<0?"運転資金が不足し、工場の営業が終了しました。":"90日間の経営を完走しました。"));
  $("run").disabled=true;return;
 }
 try{
  const a=E.estimate(state,plan());
  if(!a.canPay)throw Error("固定費を支払える資金が不足しています。");
  const severity=a.expectedLate?"この計画では納期遅れの可能性があります。":"この計画は納期内の見込みですが、実際の時間は不良品の発見数で変化します。";
  root.append(create("p","検査予定："+a.samples+" / "+a.order.units+"個 ｜ 所要時間の予想："+a.expectedMinutes+"分（納期 "+a.deadline+"分）"));
  root.append(create("p","検査・人件費等の固定的費用："+yen(a.baseCost)+" ｜ "+severity));
  root.append(create("p","修理費・返品対応費・納期遅れの費用は検査結果によって増減します。","subtle"));
  $("run").disabled=false;
 }catch(err){root.classList.add("error");root.append(create("p",err.message));$("run").disabled=true;}
}
function redraw(){overview();orderView();outcomeView();historyView();preflight();}
function submit(){
 if(recoveryBlocked||state.finished)return;
 try{
  const next=E.advance(state,plan());state=next.state;report=next.report;
  notice=next.report.escaped||next.report.lateness?"品質・納期の結果を確認して、次の改善を考えましょう。":"納期と品質を両立できました。利益の改善も考えましょう。";
  persist();redraw();$("outcome").scrollIntoView({behavior:"smooth",block:"nearest"});
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
  state=incoming;report=null;recoveryBlocked=false;unreadableRaw=null;notice="記録を読み込みました。";
  persist();redraw();
 }catch(err){alert("セーブ読込に失敗しました："+err.message);}
}
function init(){
 state=load();if(!recoveryBlocked)persist();redraw();
 for(const id of ["inspectPercent","workers","repair","overtime","calibrate"])$(id).addEventListener("change",preflight);
 $("run").addEventListener("click",submit);
 $("export").addEventListener("click",exportSave);
 $("import").addEventListener("click",()=>$("savefile").click());
 $("savefile").addEventListener("change",event=>{const f=event.target.files[0];event.target.value="";void importSave(f);});
 $("reset").addEventListener("click",()=>{
  const warning=recoveryBlocked?
   "元のセーブを上書きして新規開始します。先に元データを書き出しましたか？":
   "現在の進行を上書きして初日から始めます。よろしいですか？";
  if(!confirm(warning))return;
  state=E.initial();report=null;recoveryBlocked=false;unreadableRaw=null;notice="新しく始めました。";
  persist();redraw();
 });
}
document.addEventListener("DOMContentLoaded",init);
})();