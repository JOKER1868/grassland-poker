(async()=>{
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  const g=grassland.game,ui=grassland.ui;
  try {
    if(!g.history.some(h=>h.seat===0&&h.take))throw Error('Physical take-button tap did not execute capture');
    if(g.hands[0].length!==28)throw Error('Capture should add one net card');
    const n=ui.cards_node[0];n.emit(cc.Node.EventType.TOUCH_START);
    if(!n.getComponent('card').flag)throw Error('Preselection during bot turn failed');
    const turn=g.turn,history=g.history.length,end=Date.now()+15000;
    while(g.turn===turn&&g.history.length===history&&Date.now()<end)await wait(50);
    if(g.turn===turn&&g.history.length===history)throw Error('No bot response');
    if(!cc.isValid(n)||!ui.cards_node.includes(n)||!n.getComponent('card').flag)throw Error('Bot response cleared/rebuilt preselected hand');
    return {physicalTakeTap:true,netCards:1,preselectionPreservedAcrossBotMove:true};
  } finally {
    grassland.room.onGoback();await wait(600);
    const backup=window.__takeBackup;
    [...document.querySelectorAll('.gl-btn')].find(b=>b.textContent==='打对家 · 4人').click();grassland.restore=backup;
    if(backup.profile===null)localStorage.removeItem('grassland-totals-v1');else localStorage.setItem('grassland-totals-v1',backup.profile);
    await wait(900);delete window.__takeBackup;
  }
})()
