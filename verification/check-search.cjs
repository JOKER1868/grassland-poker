const C=require('../assets/scripts/grassland/grasslandCore');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const rounds=Number(process.argv[2]||60);
function random(seed){return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
function setup(g){if(g.phase==='declare')g.defaultDeclare();while(g.phase==='counter')g.counter(g.counterQueue[0],-1);if(g.phase==='partner')g.revealPartner(false);}
const report={kind:'paired identical deals, search seat rotates, other seats use prior heuristic',variants:[],searchCalls:0,maxMs:0};
for(const [mode,n] of [['dadaa',5],['duijia',4],['shangyou',3],['shangyou',2]]) {
  let oldScore=0,newScore=0,changed=0,searchMs=0;const differences=[];
  for(let round=0;round<rounds;round++) {
    const initial=new C.Game(mode,n,random(38129+round)),seat=round%n;setup(initial);
    let prior=0;
    for(const upgraded of [false,true]) {
      const g=C.Game.restore(JSON.parse(JSON.stringify(initial)));
      for(let step=0;!g.over;step++) {
        assert(step<500,'termination');const obs=g.observation(g.turn);let m;
        if(upgraded&&g.turn===seat) {
          const start=Date.now(),p=C.searchAdvice(obs,{samples:12});const ms=Date.now()-start;
          searchMs+=ms;report.maxMs=Math.max(report.maxMs,ms);report.searchCalls++;
          m=p.recommended;const old=C.heuristicBot(obs);
          if(JSON.stringify(m&&[m.cards.map(c=>c.id),m.take])!==JSON.stringify(old&&[old.cards.map(c=>c.id),old.take]))changed++;
          if(step===0) {
            const clone=C.Game.restore(JSON.parse(JSON.stringify(g)));
            for(let i=0;i<n;i++)if(i!==seat)clone.hands[i]=clone.hands[i].map(c=>({...c,rank:4}));
            const alternate=C.searchAdvice(clone.observation(seat),{samples:12});
            assert.deepEqual(alternate.recommended&&[alternate.recommended.cards.map(c=>c.id),alternate.recommended.take],m&&[m.cards.map(c=>c.id),m.take],'hidden cards must not affect search');
          }
          const sample=C.sampledGame(obs,random(round+79));
          if(sample){assert.deepEqual(sample.hands.map(h=>h.length),obs.counts);const all=sample.hands.flat().concat(sample.played);assert.equal(new Set(all.map(c=>c.id)).size,all.length);assert.deepEqual(sample.hands[seat],obs.hand);}
        } else m=C.heuristicBot(obs);
        g.play(m?m.cards.map(c=>c.id):[],!!(m&&m.take));
        const all=g.hands.flat().concat(g.played);assert.equal(all.length,mode==='shangyou'?54:108);assert.equal(new Set(all.map(c=>c.id)).size,all.length);
      }
      assert.equal(g.scores.reduce((a,b)=>a+b),0);if(upgraded){newScore+=g.scores[seat];differences.push(g.scores[seat]-prior);}else{oldScore+=g.scores[seat];prior=g.scores[seat];}
    }
  }
  const mean=differences.reduce((a,b)=>a+b)/rounds;
  const se=Math.sqrt(differences.reduce((a,b)=>a+(b-mean)**2,0)/(rounds-1)/rounds);
  report.variants.push({mode,players:n,pairedDeals:rounds,oldScore,newScore,meanDifference:mean,approx95Interval:[mean-1.96*se,mean+1.96*se],changed,searchMs});
  console.log(JSON.stringify(report.variants.at(-1)));
}
fs.writeFileSync(__dirname+'/search-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
