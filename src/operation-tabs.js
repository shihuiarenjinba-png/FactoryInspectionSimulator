/* Functional operation tabs; all game inputs and models remain in their original sections. */
(() => {"use strict";
 const layout=[{"id":"orders","label":"📦 注文","panels":[0]},{"id":"quality","label":"🔍 検査方針・修理","panels":[1]},{"id":"run","label":"🚚 出荷・結果","panels":[2,3]},{"id":"history","label":"📋 記録・セーブ","details":".records"}];
 let selected=layout[0].id;
 function boot(){
  const main=document.querySelector("main.shell");
  if(!main)return;
  const panels=Array.from(main.children).filter(x=>x.matches("section.panel"));
  const expected=4;
  if(panels.length!==expected){console.warn("Operation tabs are disabled: page structure changed.");return;}
  const nav=document.createElement("nav");nav.id="operationTabs";nav.className="operation-tabs";
  nav.setAttribute("role","tablist");nav.setAttribute("aria-label","ゲーム操作の画面切替");
  const screenByName={};
  const controls=[];
  for(const page of layout){
   const button=document.createElement("button");button.type="button";
   button.dataset.operationTab=page.id;button.setAttribute("role","tab");
   button.textContent=page.label;button.tabIndex=-1;
   nav.append(button);controls.push(button);
   screenByName[page.id]=page.panels? page.panels.map(i=>panels[i]) :
     [main.querySelector("details"+page.details)];
   if(screenByName[page.id].some(x=>!x))throw Error("Missing game screen "+page.id);
   for(const element of screenByName[page.id])element.dataset.operationScreen=page.id;
  }
  panels[0].parentNode.insertBefore(nav,panels[0]);
  const nextActions={"orders":["quality","次へ：検査方針と人員を決める →"],"quality":["run","次へ：費用・時間を確認して出荷する →"],"run":["orders","次の注文を確認する →"]};
  for(const [from,[to,label]] of Object.entries(nextActions)){
   const area=screenByName[from].at(-1);
   const foot=document.createElement("div");foot.className="operation-next";
   const button=document.createElement("button");button.type="button";button.className="operation-next-button";
   button.textContent=label;button.addEventListener("click",()=>open(to));
   foot.append(button);area.append(foot);
  }

  function open(id,{focus=false}={}){
   if(!screenByName[id])return false;
   selected=id;
   for(const page of layout){
    const isActive=page.id===id;
    for(const section of screenByName[page.id]){
     section.hidden=!isActive;
     if(isActive&&section.tagName==="DETAILS")section.open=true;
     section.setAttribute("aria-hidden",String(!isActive));
    }
   }
   for(const b of controls){
    const active=b.dataset.operationTab===id;b.setAttribute("aria-selected",String(active));b.tabIndex=active?0:-1;
    if(active&&focus)b.focus();
   }
   return true;
  }
  nav.addEventListener("click",event=>{const b=event.target.closest("[data-operation-tab]");if(b)open(b.dataset.operationTab);});
  nav.addEventListener("keydown",event=>{
   if(!["ArrowLeft","ArrowRight","Home","End"].includes(event.key))return;
   event.preventDefault();let index=layout.findIndex(x=>x.id===selected);
   if(event.key==="Home")index=0;else if(event.key==="End")index=layout.length-1;
   else index=(index+(event.key==="ArrowLeft"?-1:1)+layout.length)%layout.length;
   open(layout[index].id,{focus:true});
  });
  
  window.OperationTabs=Object.freeze({open,current:()=>selected});
  open(selected);
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
})();