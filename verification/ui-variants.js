(async()=>{
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  const errors=[];window.addEventListener('error',e=>errors.push(e.message));
  const savedProfile=localStorage.getItem('grassland-totals-v1'),savedGame=localStorage.getItem('grassland-save-v1');
  const guard=document.createElement('div');guard.className='gl-overlay';guard.style.zIndex='100';guard.style.background='#0001';guard.style.alignItems='flex-start';guard.style.pointerEvents='auto';guard.textContent='正在自动验证牌桌，请稍候…';document.body.appendChild(guard);
  const realTimeout=window.setTimeout;
  window.setTimeout=function(fn,ms,...args){return realTimeout(fn,[350,950].includes(ms)?80:ms,...args);};
  function click(text){const b=[...document.querySelectorAll('.gl-btn')].find(b=>b.textContent===text);if(!b)throw Error('Missing button '+text);b.click();}
  async function until(fn,ms=20000){const end=Date.now()+ms;while(!fn()){if(Date.now()>end)throw Error('UI stage stalled');await wait(50);}}
  const results=[];
  try {
    for(const [name,n] of [['打大A · 5人',5],['打对家 · 4人',4],['争上游 · 3人',3],['争上游 · 2人',2]]){
      if(grassland.room)grassland.room.onGoback();await until(()=>!!document.querySelector('.gl-panel')&&document.querySelector('.gl-panel').innerText.includes('选择玩法'));
      click(name);await until(()=>!!grassland.room&&grassland.room.playerNodeList.length===n&&!grassland.game);
      if(grassland.autoplay)click('取消托管');
      grassland.room.onBtnReadey();await until(()=>!grassland.busy&&!!grassland.game);
      const g=grassland.game;
      const before=JSON.parse(localStorage.getItem('grassland-totals-v1')||'{"scores":[0,0,0,0,0]}').scores;
      if(grassland.ui.cards_node.length!==g.hands[0].length)throw Error('Deal hand mismatch '+name);
      const expected=n<4?54:108;if(g.hands.flat().length!==expected)throw Error('Deal count mismatch');
      if(n===5){while(g.phase!=='play'){const buttons=[...document.querySelectorAll('.gl-btn')];const b=buttons.find(b=>['不亮','不反','不亮 · 暗打'].includes(b.textContent));if(b)b.click();await wait(200);}}
      click('托管');await until(()=>g.over,90000);
      if(!document.querySelector('.gl-panel')?.innerText.includes('再来一局'))throw Error('Settlement missing');
      if(grassland.ui.cards_node.length!==g.hands[0].length)throw Error('Final UI hand mismatch');
      const after=JSON.parse(localStorage.getItem('grassland-totals-v1')).scores;
      g.scores.forEach((delta,i)=>{if(after[i]!==before[i]+delta)throw Error('Cumulative score mismatch');});
      click('取消托管');const repeated=JSON.parse(localStorage.getItem('grassland-totals-v1')).scores;
      if(JSON.stringify(after)!==JSON.stringify(repeated))throw Error('Settlement counted twice');
      results.push({name,players:n,moves:g.history.length,finalHumanCards:g.hands[0].length,finished:g.finished.slice(),scores:g.scores.slice(),totals:after,settlementIdempotent:true,lastStrategy:grassland.lastSearch});
    }
    return {results,errors,aiTimerAcceleratedForTest:true};
  } finally {
    window.setTimeout=realTimeout;if(grassland.room)grassland.room.onGoback();
    if(savedProfile===null)localStorage.removeItem('grassland-totals-v1');else localStorage.setItem('grassland-totals-v1',savedProfile);
    if(savedGame===null)localStorage.removeItem('grassland-save-v1');else localStorage.setItem('grassland-save-v1',savedGame);
    guard.remove();
  }
})()
