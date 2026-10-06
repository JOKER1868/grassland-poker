(async()=>{
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  const errors=[];window.addEventListener('error',e=>errors.push(e.message));
  const click=text=>{const b=[...document.querySelectorAll('.gl-btn')].find(b=>b.textContent===text);if(!b)throw Error('Button not found: '+text);b.click();};
  if(grassland.room)grassland.room.onGoback();await wait(1000);
  click('打大A · 5人');await wait(1500);
  if(!grassland.room||grassland.room.playerNodeList.length!==5)throw Error('Five seats failed');
  grassland.room.onBtnReadey();const samples=[];
  for(let i=0;i<10;i++){await wait(500);samples.push({busy:grassland.busy,cards:grassland.ui.cards_node.length,counts:grassland.dealCounts&&grassland.dealCounts.slice(),phase:grassland.game.phase,dialog:!!grassland.dialog,claimButtons:document.getElementById('gl-declare')?.innerText});}
  const g=grassland.game;
  if(grassland.busy)throw Error('Deal never completed');
  if(grassland.ui.cards_node.length!==g.hands[0].length)throw Error('Human hand count mismatch');
  if(!samples.some(s=>s.busy&&s.cards>0&&s.cards<g.hands[0].length))throw Error('No visible partial hand during deal');
  if(g.phase==='declare'||!g.dealComplete)throw Error('Deal did not resolve declaration');
  if(document.getElementById('gl-declare'))throw Error('Claim row remained after dealing');
  return {seats:grassland.room.playerNodeList.length,samples,finalCounts:g.hands.map(h=>h.length),uiCount:grassland.ui.cards_node.length,errors};
})()
