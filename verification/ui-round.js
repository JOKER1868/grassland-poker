(async()=>{
  const wait=ms=>new Promise(r=>setTimeout(r,ms));const errors=[];
  window.addEventListener('error',e=>errors.push(e.message));
  function click(text){const b=[...document.querySelectorAll('.gl-btn')].find(b=>b.textContent===text);if(b)b.click();return !!b;}
  if(grassland.autoplay)click('取消托管');
  if(grassland.game.over){click('再来一局');while(grassland.busy)await wait(100);}
  const end=Date.now()+20000;
  while(grassland.game.phase!=='play'&&Date.now()<end){click('不亮');click('不反');click('不亮 · 暗打');await wait(300);}
  if(grassland.game.phase!=='play')throw Error('Setup did not reach play');
  while(grassland.game.turn!==0&&!grassland.game.over)await wait(100);
  if(grassland.game.over)throw Error('Game ended before human turn');
  const g=grassland.game,turn=g.turn,history=g.history.length,hand=g.hands[0].map(c=>c.id).join(',');
  const guard=document.createElement('div');guard.className='gl-overlay';guard.textContent='正在验证回合保持，请稍候…';document.body.appendChild(guard);
  await wait(16000);
  guard.remove();
  if(g.turn!==turn||g.history.length!==history||g.hands[0].map(c=>c.id).join(',')!==hand)throw Error('Human turn changed while waiting');
  if(grassland.ui.timeLabel.node.active)throw Error('Human countdown visible');
  const manualActions=[];
  for(let i=0;i<3&&!g.over;i++) {
    while(g.turn!==0&&!g.over)await wait(100);if(g.over)break;
    const m=GrasslandCore.bot(g.observation(0));grassland.hintIndex=0;
    if(m){grassland.ui.onButtonClick(null,'tipcard');
      while(grassland.hintPending)await wait(50);
      const selected=grassland.ui.choose_card_data.map(c=>c.index);
      if(selected.length!==m.cards.length)throw Error('Hint did not select expected cards');
      if(m.take){grassland.ui.onButtonClick(null,'takecard');}
      else grassland.ui.onButtonClick(null,'pushcard');
      manualActions.push({take:m.take,count:selected.length});
    } else {grassland.ui.onButtonClick(null,'nopushcard');manualActions.push({pass:true});}
    await wait(300);
    if(grassland.ui.cards_node.length!==g.hands[0].length)throw Error('UI hand count diverged after play');
  }
  if(!g.over)click('托管');
  const deadline=Date.now()+60000;while(!g.over&&Date.now()<deadline)await wait(200);
  if(!g.over)throw Error('UI autoplay did not finish');
  if(!grassland.dialog)throw Error('Settlement not visible');
  return {mode:g.mode,players:g.n,noTimeoutMs:16000,manualActions,moves:g.history.length,finished:g.finished,scores:g.scores,errors,settlement:document.querySelector('.gl-panel')?.innerText};
})()
