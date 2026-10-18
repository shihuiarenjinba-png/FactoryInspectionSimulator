"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const content=f=>fs.readFileSync(path.join(__dirname,"..",f),"utf8");
test("clear three-step workflow has all functional controls",()=>{
 const html=content("index.html");
 assert.equal((html.match(/class="step"/g)||[]).length,3);
 for(const name of ["day","cash","reputation","shipments","order","inspectPercent","workers","repair","overtime",
   "calibrate","preview","run","outcome","history","export","import","reset","savefile"])
  assert.match(html,new RegExp('id="'+name+'"'),name);
 assert.match(html,/<details class="advanced">/);
 assert.match(html,/<details class="records">/);
});
test("no online calls, remote resources or embedded third-party tracking",()=>{
 const html=content("index.html"),app=content("src/app.js");
 assert.match(html,/connect-src 'none'/);
 assert.doesNotMatch(html,/<script[^>]+https?:/);
 assert.doesNotMatch(app,/fetch\(|XMLHttpRequest|sendBeacon/);
});
test("invalid save never silently overwrites original input",()=>{
 const app=content("src/app.js");
 assert.match(app,/recoveryBlocked=true;unreadableRaw=raw/);
 assert.match(app,/if\(recoveryBlocked\)return false/);
 assert.match(app,/先に元データを書き出しましたか/);
 assert.match(app,/const incoming=E\.validate\(data\.state\)/);
});
test("hidden manufacturing risk is not revealed by the player UI",()=>{
 const html=content("index.html"),app=content("src/app.js");
 assert.doesNotMatch(html+app,/_latentRisk/);
 assert.doesNotMatch(html+app,/hash\(s\.seed/);
 assert.match(app,/E\.estimate\(state,plan\(\)\)/);
});
