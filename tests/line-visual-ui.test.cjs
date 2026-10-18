const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs");
const html=fs.readFileSync("index.html","utf8"),app=fs.readFileSync("src/app.js","utf8");
test("inspection meters derive from engine estimate and show remaining uncertainty",()=>{
 assert.match(html,/id="lineVizContent"/);
 assert.match(app,/function lineView\(estimate,error\)/);
 assert.match(app,/lineView\(a\);if\(!a\.canPay\)/);
 assert.match(app,/estimate\.samples/);assert.match(app,/estimate\.expectedMinutes/);
 assert.match(app,/estimate\.expectedLate/);
 assert.match(app,/実際の不良数や補償費は未確定/);
});
