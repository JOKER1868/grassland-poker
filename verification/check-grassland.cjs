const assert=require('node:assert/strict');
const fs=require('node:fs');
const C=require('../assets/scripts/grassland/grasslandCore');
const d=C.deck(2);
let seed=76123;
const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
function cards(ranks){const used=new Set();return ranks.map(r=>{const c=d.find(c=>c.rank===r&&!used.has(c.id));used.add(c.id);return c;});}
const move=r=>C.classify(cards(r));
assert(!C.beats(move([8,8]),move([4])),'pair cannot cross single');
assert(!C.beats(move([8,8,8]),move([4,4,5,5,6,6])),'triple cannot beat double dragon');
assert(C.beats(move([8,8,8,8]),move([4,4,5,5,6,6])));
assert.equal(move([14,2,3]).power,1);
assert(!move([13,14,2]));
assert(C.beats(move([5,6,7]),move([14,2,3])));
assert(C.canTake(move([4,4]),move([8,8,8])));
assert(!C.beats(move([4,4]),move([8,8,8])));
assert(C.canTake(move([4,4,4]),move([8,8,8,8])));
assert(C.canTake(move([4,4]),move([4,4,4])));
assert(!C.classify([d[0],d[0]]));
{
  const hand=cards([6,6,6,6,7,7,9]);
  const obs={hand,main:-1,table:null,owner:-1,seat:0,ally:false,allies:[true,false,false],counts:[hand.length,10,10],played:[]};
  const m=C.bot(obs);assert(!m.cards.some(c=>c.rank===6)||m.cards.filter(c=>c.rank===6).length===4,'do not casually split a bomb');
  obs.counts=[hand.length,1,10];assert(C.bot(obs).cards.length>=2,'lead a combination against a one-card opponent');
  obs.table=move([5]);obs.owner=1;obs.ally=true;obs.allies=[true,true,false];obs.counts=[hand.length,3,10];
  const plan=C.advice(obs);assert.equal(plan.recommended,null);assert(plan.options.length>0,'pass recommendation differs from having no legal moves');
  assert(plan.reason.includes('队友'));
}
function setup(g){
  if(g.phase==='declare')g.defaultDeclare();
  while(g.phase==='counter')g.counter(g.counterQueue[0],-1);
  if(g.phase==='partner')g.revealPartner(false);
}
// Explicit capture must conserve every physical card and keep the capturing fours on table.
{
  const g=new C.Game('shangyou',3,rand);g.hands=[cards([8,8,8,9]),cards([4,4,10]),cards([11])];g.turn=0;
  g.play(g.hands[0].filter(c=>c.rank===8).map(c=>c.id));const before=g.hands[1].length;
  assert.throws(()=>g.play(g.hands[1].filter(c=>c.rank===4).map(c=>c.id),false));
  g.play(g.hands[1].filter(c=>c.rank===4).map(c=>c.id),true);assert.equal(g.hands[1].length,before+1);assert.equal(g.table.type,1);
}
// Counter is any same-suit double ace and changes the master suit.
{
  const g=new C.Game('dadaa',5,rand);const two=d.filter(c=>c.rank===14&&c.suit===2);const a=d.find(c=>c.rank===14&&c.suit===1);
  g.hands=[[a],two,[],[],[]];g.declare(0,1);g.counter(1,2);assert.equal(g.main,2);assert.equal(g.declarer,1);assert(g.soloBright);assert.equal(g.phase,'play');
}
// Dark solo's 2nd-4th are draws; bright solo loses as soon as another player finishes.
{
  const g=new C.Game('dadaa',5,rand);g.team=[0,1,1,1,1];g.declarer=0;
  g.finished=[1,0];g.hands=[[],[],cards([5]),cards([6]),cards([7])];g.settle();assert.equal(g.winner,-1);
  g.finished=[1];g.soloBright=true;g.settle();assert.equal(g.winner,1);assert.equal(g.scores.reduce((a,b)=>a+b),0);
}
const report={seed:76123,variants:[],rules:'confirmed invariants, not a substitute for reference-game verification'};
for(const [mode,n] of [['dadaa',5],['duijia',4],['shangyou',3],['shangyou',2]]) {
  let maxSteps=0,totalMoves=0;
  for(let round=0;round<20;round++) {
    const g=new C.Game(mode,n,rand);setup(g);const expected=mode==='shangyou'?54:108;
    for(let steps=0;!g.over;steps++) {
      assert(steps<500,'game should terminate');const seat=g.turn,obs=g.observation(seat),m=C.bot(obs);
      const clone=C.Game.restore(JSON.parse(JSON.stringify(g)));for(let i=0;i<g.n;i++)if(i!==seat)clone.hands[i]=clone.hands[i].map((c,j)=>({...c,rank:j%13+2,suit:j%4}));
      // Identity information is held separately; hidden card values cannot affect bot choice.
      const other=C.bot(clone.observation(seat));
      assert.deepEqual(m&&[m.cards.map(c=>c.id),m.take],other&&[other.cards.map(c=>c.id),other.take]);
      g.play(m?m.cards.map(c=>c.id):[],m?m.take:false);
      const all=g.hands.flat().concat(g.played);assert.equal(all.length,expected);assert.equal(new Set(all.map(c=>c.id)).size,expected);
      maxSteps=Math.max(maxSteps,steps+1);totalMoves++;
    }
    assert.equal(g.scores.reduce((a,b)=>a+b),0);assert(g.finished.length>0);
  }
  report.variants.push({mode,players:n,games:20,maxSteps,totalMoves});
}
fs.writeFileSync(require('node:path').join(__dirname,'grassland-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
