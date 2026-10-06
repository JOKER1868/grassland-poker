(async()=>{
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  const assert=(x,message)=>{if(!x)throw Error(message);};
  const until=async fn=>{const end=Date.now()+20000;while(!fn()){assert(Date.now()<end,'UI wait expired');await wait(20);}};
  const click=text=>{const b=[...document.querySelectorAll('.gl-btn')].find(b=>b.textContent===text);assert(b,'Missing '+text);b.click();};
  const backup=grassland.game?JSON.stringify({mode:grassland.mode,count:grassland.count,game:grassland.game}):localStorage.getItem('grassland-save-v1');
  const totals=localStorage.getItem('grassland-totals-v1');
  const guard=document.createElement('div');guard.className='gl-overlay';guard.style.zIndex='100';guard.style.background='#0001';guard.style.alignItems='flex-start';guard.textContent='正在验证发牌与亮A流程…';document.body.appendChild(guard);
  const random=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  let chosenSeed,chosenSuit;
  for(let seed=1;seed<2000;seed++) {
    const g=new GrasslandCore.Game('dadaa',5,random(seed));
    const x=g.dealOrder.findIndex(x=>x.seat===0&&g.hands[0].some(c=>c.id===x.id&&c.rank===14));
    if(x<0||x>30)continue;const card=g.hands[0].find(c=>c.id===g.dealOrder[x].id);
    if(g.hands[0].filter(c=>c.rank===14&&c.suit===card.suit).length===2){chosenSeed=seed;chosenSuit=card.suit;break;}
  }
  assert(chosenSeed,'No deterministic fixture');
  try {
    if(grassland.room)grassland.room.onGoback();await until(()=>document.querySelector('.gl-home'));
    click('打大A · 5人');await until(()=>grassland.room&&!grassland.game);
    if(grassland.autoplay)click('取消托管');
    const original=Math.random;Math.random=random(chosenSeed);try{grassland.room.onBtnReadey();}finally{Math.random=original;}
    await until(()=>document.getElementById('gl-declare'));
    let g=grassland.game;assert(grassland.busy&&g.dealCursor<108,'Claim must be offered during deal');
    assert(g.aceOptions(0).find(o=>o.suit===chosenSuit).count===1,'Only first ace should be visible');
    assert(![...document.querySelectorAll('#gl-declare button')].some(b=>b.textContent==='亮双 '+GrasslandCore.suits[chosenSuit]+'A'),'Future second ace leaked into options');
    const row=document.getElementById('gl-declare').getBoundingClientRect(),canvas=grassland.room.node;
    const handTopCss=(canvas.height-Math.max(...grassland.ui.cards_node.map(n=>{const b=n.getBoundingBoxToWorld();return b.y+b.height;})))*innerHeight/canvas.height;
    assert(row.bottom<handTopCss,'Claim controls cover hand');
    click('亮 '+GrasslandCore.suits[chosenSuit]+'A');const claimCursor=g.dealCursor;
    assert(g.declarer===0&&g.main===chosenSuit&&g.phase==='declare','Claim accepted before post-deal stages');
    assert(!document.getElementById('gl-declare'),'Claim controls should disappear once claimed');
    grassland.room.onGoback();await until(()=>document.querySelector('.gl-home'));
    const saved=JSON.parse(localStorage.getItem('grassland-save-v1')).game;
    assert(saved.dealCursor===claimCursor&&saved.dealComplete===false,'Partial deal save');
    click('继续上局');await until(()=>grassland.room&&grassland.game?.declarer===0&&grassland.busy);
    g=grassland.game;const resumeCursor=g.dealCursor;assert(resumeCursor>=claimCursor&&g.main===chosenSuit,'Partial deal resume');
    await until(()=>!grassland.busy);
    assert(g.dealComplete&&g.dealCursor===108,'Deal must fully complete');
    assert(g.hands.flat().length===108&&new Set(g.hands.flat().map(c=>c.id)).size===108,'No duplicate deal cards');
    assert(grassland.ui.cards_node.length===g.hands[0].length,'Full human hand displayed');
    assert(g.phase==='counter'&&g.counterQueue.includes(0),'Future second ace must allow counter after full deal');
    assert(!document.getElementById('gl-declare'),'No stale claim controls');
    return {seed:chosenSeed,claimCursor,resumeCursor,mainSuit:chosenSuit,noFutureAceLeak:true,noHandOverlap:true,partialDealResumed:true,fullCounts:g.hands.map(h=>h.length),counterAfterDeal:true};
  } finally {
    if(grassland.room)grassland.room.onGoback();await wait(600);
    if(backup===null)localStorage.removeItem('grassland-save-v1');else localStorage.setItem('grassland-save-v1',backup);
    if(totals===null)localStorage.removeItem('grassland-totals-v1');else localStorage.setItem('grassland-totals-v1',totals);
    guard.remove();
  }
})()
