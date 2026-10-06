(async()=>{
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  window.__takeBackup={mode:grassland.mode,count:grassland.count,game:JSON.parse(JSON.stringify(grassland.game)),profile:localStorage.getItem('grassland-totals-v1')};
  const g=new GrasslandCore.Game('duijia',4);
  function moveRank(rank,seat,count){
    while(g.hands[seat].filter(c=>c.rank===rank).length<count){
      const donor=g.hands.findIndex((h,i)=>i!==seat&&h.some(c=>c.rank===rank));
      const ix=g.hands[donor].findIndex(c=>c.rank===rank),swap=g.hands[seat].findIndex(c=>c.rank!==rank);
      [g.hands[donor][ix],g.hands[seat][swap]]=[g.hands[seat][swap],g.hands[donor][ix]];
    }
  }
  moveRank(4,0,2);moveRank(8,3,3);g.turn=3;
  g.play(g.hands[3].filter(c=>c.rank===8).slice(0,3).map(c=>c.id));
  grassland.room.onGoback();await wait(600);
  [...document.querySelectorAll('.gl-btn')].find(b=>b.textContent==='打对家 · 4人').click();
  grassland.restore={game:JSON.parse(JSON.stringify(g))};await wait(900);
  const ui=grassland.ui;
  ui.cards_node.filter(n=>n.getComponent('card').card_data.rank===4).slice(0,2).forEach(n=>n.emit(cc.Node.EventType.TOUCH_START));
  await wait(150);
  if(!ui.glTake.getComponent(cc.Button).interactable)throw Error('Take button should enable for two fours against a triple');
  return {selected:ui.choose_card_data.map(c=>c.index),beforeCount:grassland.game.hands[0].length,button:ui.glTake.getBoundingBoxToWorld(),turn:grassland.game.turn};
})()
