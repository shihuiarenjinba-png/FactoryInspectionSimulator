/* Decorative scene headers only. All values remain owned by existing simulation controllers. */
/* No external images, sounds, paid assets, network calls or save format changes. */
(() => {"use strict";
const CONFIG={"orders":["受注・資材エリア","注文と納期の確認画面。ライン作業員は表示しません。","factory-order"],"quality":["検査ライン","検査率・人員・修理の操作場所。作業員表示は入力人数と連動します。","factory-line"],"run":["出荷ゲート","出荷・利益・品質の結果を確認します。稼働中の動画ではありません。","factory-shipping"],"history":["検査記録","過去の出荷と保存データを管理します。","paper-files"]};
const theme="factory";
const $=id=>document.getElementById(id);
function build(){
 const nav=$("operationTabs");if(!nav)return;
 const scenes=[];
 for(const [key,[title,description,visual]] of Object.entries(CONFIG)){
   const panel=document.querySelector('[data-operation-screen="'+key+'"]');
   if(!panel||panel.querySelector(".context-scene"))continue;
   const figure=document.createElement("div");figure.className="context-scene";
   figure.dataset.sceneKey=key;figure.dataset.sceneVisual=visual;figure.dataset.sceneTheme=theme;
   const illustration=document.createElement("div");illustration.className="context-illustration";illustration.setAttribute("aria-hidden","true");
   for(const shape of ["backdrop","floor","structure","object","object-secondary","detail","worker"]){
    const piece=document.createElement("span");piece.className="scene-shape scene-"+shape;illustration.append(piece);
   }
   const words=document.createElement("div");words.className="context-description";
   const heading=document.createElement("h3");heading.textContent=title;
   const explainer=document.createElement("p");explainer.textContent=description;
   words.append(heading,explainer);figure.append(illustration,words);panel.insertBefore(figure,panel.firstChild);
   scenes.push(figure);
 }
 const staffControl=$(theme==="small"?"employees":theme==="factory"?"workers":null);
 const staffCount=$(theme==="small"?"headcount":null);
 function updateStaff(){
  const value=staffControl?.value??staffCount?.textContent??"0";
  const count=Number(String(value).replace(/[^0-9]/g,""));
  for(const element of scenes)element.dataset.workerVisible=Number.isFinite(count)&&count>0?"true":"false";
 }
 if(staffControl){staffControl.addEventListener("input",updateStaff);staffControl.addEventListener("change",updateStaff);}
 if(staffCount){const observer=new MutationObserver(updateStaff);observer.observe(staffCount,{childList:true,subtree:true,characterData:true});}
 updateStaff();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",build,{once:true});else build();
})();