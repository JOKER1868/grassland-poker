// ADB forwards only this app's development WebView; no third-party app inspection.
const fs=require('node:fs');
(async()=>{
  const pages=await (await fetch('http://127.0.0.1:9222/json')).json();
  const page=pages.find(p=>p.url.startsWith('https://offline.local/'));
  if(!page)throw Error('Own app WebView not ready');
  const ws=new WebSocket(page.webSocketDebuggerUrl);await new Promise((yes,no)=>{ws.onopen=yes;ws.onerror=no;});
  let seq=0;const pending=new Map();
  ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&pending.has(m.id)){pending.get(m.id)(m);pending.delete(m.id);}};
  async function call(method,params){const id=++seq;return new Promise(yes=>{pending.set(id,yes);ws.send(JSON.stringify({id,method,params}));});}
  const expr=process.argv[2]==='--file'?fs.readFileSync(process.argv[3],'utf8'):process.argv.slice(2).join(' ')||'({scene:cc.director.getScene().name,game:window.grassland&&window.grassland.game,dialog:document.querySelector(".gl-panel")?.innerText})';
  const result=await call('Runtime.evaluate',{expression:expr,returnByValue:true,awaitPromise:true});
  console.log(JSON.stringify(result.result,null,2));ws.close();
  if(result.result.exceptionDetails)process.exitCode=1;
})().catch(e=>{console.error(e.message);process.exitCode=1;});
