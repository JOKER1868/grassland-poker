const assert=require('node:assert/strict');
const C=require('../assets/scripts/grassland/grasslandCore');
function random(seed){return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
for(let seed=1;seed<=40;seed++) {
  let g=new C.Game('dadaa',5,random(seed));g.beginDeal();
  assert(g.hands.flat().length===108);assert(g.aceOptions(0).length===0);
  assert.throws(()=>g.declare(0,0));assert.throws(()=>g.finishDeal());
  let claimed=false;
  for(let i=0;i<108;i++) {
    const x=g.dealNext();assert(x.card);
    assert.equal(g.visibleHand(x.seat).length,g.dealOrder.slice(0,i+1).filter(c=>c.seat===x.seat).length);
    if(!claimed&&x.card.rank===14) {
      g.declare(x.seat,x.card.suit);claimed=true;
      assert.equal(g.phase,'declare','Counter and play must wait until dealing finishes');
      assert.throws(()=>g.declare(x.seat,x.card.suit));assert.throws(()=>g.play([x.card.id]));
    }
    if(i===37)g=C.Game.restore(JSON.parse(JSON.stringify(g)));
  }
  g.finishDeal();assert(g.dealComplete);assert.notEqual(g.phase,'declare');
  const expected=g.hands.map((h,i)=>[0,1,2,3].some(suit=>h.filter(c=>c.rank===14&&c.suit===suit).length===2)?i:-1).filter(i=>i>=0);
  if(expected.length)assert.deepEqual(g.counterQueue.slice().sort(),expected.sort());
  const untouched=new C.Game('dadaa',5,random(seed));untouched.beginDeal();while(untouched.dealNext()){}untouched.finishDeal();
  assert.equal(untouched.declarer,untouched.defaultDeclarer);assert.equal(untouched.main,1);
}
for(const mode of ['duijia','shangyou']){const g=new C.Game(mode,3);g.beginDeal();assert.throws(()=>g.play([g.hands[g.turn][0].id]));while(g.dealNext()){}g.finishDeal();assert.equal(g.phase,'play');}
console.log('40 declaration/resume/default/counter-queue cases passed; non-A games cannot play before deal completion.');
