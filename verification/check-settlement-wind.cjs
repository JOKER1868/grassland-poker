const assert=require('node:assert/strict');
const fs=require('node:fs');
const C=require('../assets/scripts/grassland/grasslandCore');
function permutations(xs){return xs.length?xs.flatMap((x,i)=>permutations(xs.filter((_,j)=>j!==i)).map(p=>[x,...p])):[[]];}
const orders=permutations([0,1,2,3,4]);
const report={source:'Reference score screenshots 6-9; final user-confirmed automatic nearest teammate wind and joker comparison',settlements:0,draws:0,windCases:0,jokerCases:0};
function fixture(team,bright,soloBright){
  const g=new C.Game('dadaa');g.phase='play';g.declarer=0;g.main=1;
  g.team=team;g.bright=bright;g.soloBright=soloBright;g.finished=[];
  return g;
}
function finish(g,seat){
  g.played.push(...g.hands[seat]);g.hands[seat]=[];g.finished.push(seat);
  const all=g.hands.flat().concat(g.played);
  assert.equal(all.length,108);assert.equal(new Set(all.map(c=>c.id)).size,108);
}
for(const bright of [false,true])for(const order of orders){
  const team=[0,1,0,1,1],g=fixture(team,bright,false);
  const end0=Math.max(order.indexOf(0),order.indexOf(2));
  const end1=Math.max(...[1,3,4].map(i=>order.indexOf(i)));
  const end=Math.min(end0,end1);
  for(let i=0;i<=end;i++){finish(g,order[i]);assert.equal(g.decided(),i===end,'2v3 premature or delayed settlement');}
  g.settle();
  const winner=team[order[0]]===(end0<end1?0:1)?team[order[0]]:-1;
  assert.equal(g.winner,winner);
  let expected=[0,0,0,0,0];
  if(winner===0){
    const unit=4-(end0+1);
    expected=team.map((t,i)=>t===0?unit*(bright?3:i===0?2:1):-unit*(bright?2:1));
  }else if(winner===1){
    // Reference's three separate capture rows: secondary, principal, both.
    const row=g.finished.includes(0)?1:g.finished.includes(2)?2:3;
    expected=team.map((t,i)=>t===0?-row*(bright?3:i===0?2:1):row*(bright?2:1));
  }else report.draws++;
  assert.deepEqual(g.scores,expected,{bright,order});
  assert.equal(g.scores.reduce((a,b)=>a+b),0);report.settlements++;
}
for(const bright of [false,true])for(const order of orders){
  const g=fixture([0,1,1,1,1],false,bright);
  const position=order.indexOf(0),end=bright?0:Math.min(position,3);
  for(let i=0;i<=end;i++){finish(g,order[i]);assert.equal(g.decided(),i===end,'Solo premature or delayed settlement');}
  g.settle();
  const winner=position===0?0:bright||position===4?1:-1;
  const amount=bright?64:32,expected=winner<0?[0,0,0,0,0]:
    [amount,...Array(4).fill(-amount/4)].map(v=>winner===0?v:-v);
  assert.equal(g.winner,winner);assert.deepEqual(g.scores,expected,{bright,order});
  if(winner<0)report.draws++;report.settlements++;
}
{
  const g=fixture([0,1,0,1,1],false,false);g.revealed=[true,false,false,false,false];
  // Hidden opponents must be skipped, even before main identities are exposed.
  finish(g,1);assert.equal(g.wind(1),3);report.windCases++;
  assert(!g.knowsAlly(3,4));assert(!g.knowsAlly(0,2));
  g.revealed[2]=true;
  assert.equal(g.wind(1),3);assert(g.knowsAlly(3,4));assert(g.knowsAlly(0,2));report.windCases++;
  finish(g,3);assert.equal(g.wind(1),4);report.windCases++;
  g.revealed[2]=false;finish(g,0);assert.equal(g.wind(0),2);report.windCases++;
  finish(g,4);assert.equal(g.wind(4),2);report.windCases++;
}
{
  const kings=C.deck(2).filter(c=>c.rank>14);
  const small=kings.filter(c=>c.rank===15),big=kings.filter(c=>c.rank===16);
  const two=[small,[small[0],big[0]],big].map(cs=>C.classify(cs));
  assert(C.beats(two[1],two[0]));assert(C.beats(two[2],two[1]));
  assert(!C.beats(two[0],two[1]));assert(!C.beats(two[1],two[2]));
  const three=[C.classify([...small,big[0]]),C.classify([...big,small[0]])];
  assert(C.beats(three[1],three[0]));assert(!C.beats(three[0],three[1]));
  assert(!C.beats(C.classify([small[1],big[1]]),two[1]));report.jokerCases=7;
}
{
  const g=new C.Game('duijia',4);g.hands[0]=[];
  assert.equal(g.wind(0),2);g.hands[2]=[];assert.equal(g.wind(0),1);report.windCases+=2;
  const f=new C.Game('shangyou',3);f.hands[0]=[];
  assert.equal(f.wind(0),1);f.hands[1]=[];assert.equal(f.wind(0),2);report.windCases+=2;
}
fs.writeFileSync(__dirname+'/settlement-wind-report.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
