/* Local rules and bots. No Cocos, storage or networking dependencies. */
(function(root, factory) {
  const api=factory();
  if(typeof module==='object' && module.exports) module.exports=api;
  else root.GrasslandCore=api;
})(typeof window==='object'?window:globalThis,function() {
  'use strict';
  const names=['单牌','对子','龙','双龙','蛋子','大蛋子','双王','连珠蛋','假八','真七','真八','三王','四王','双大A'];
  const suits=['♠','♥','♣','♦'];
  function power(c,main) {return c.rank===14&&c.suit===main?18:c.rank===16?17:c.rank===15?16:c.rank===3?15:c.rank===2?14:c.rank===14?13:c.rank-2;}
  function label(c) {return c.rank>14?(c.rank===16?'大王':'小王'):suits[c.suit]+({11:'J',12:'Q',13:'K',14:'A'}[c.rank]||c.rank);}
  function deck(copies) {
    const d=[];
    for(let z=0;z<copies;z++) {
      for(let r=2;r<=14;r++)for(let s=0;s<4;s++)d.push({id:d.length,rank:r,suit:s});
      d.push({id:d.length,rank:15,suit:4});d.push({id:d.length,rank:16,suit:4});
    }
    return d;
  }
  function sort(h,main) {h.sort((a,b)=>power(b,main)-power(a,main)||a.suit-b.suit||a.id-b.id);return h;}
  function classify(cards,main=-1) {
    if(!cards.length || new Set(cards.map(c=>c.id)).size!==cards.length)return null;
    const n=cards.length,p=power(cards[0],main),ranks=new Map();
    const make=(type,val=p)=>({cards:cards.slice(),type,power:val,name:names[type]});
    cards.forEach(c=>ranks.set(c.rank,(ranks.get(c.rank)||0)+1));
    if(n===1)return make(0);
    if(n===2 && cards.every(c=>c.rank===14&&c.suit===main))return make(13,18);
    if(cards.every(c=>c.rank>14) && n<=4)return make(n===2?6:n===3?11:12,cards.filter(c=>c.rank===16).length);
    if(cards.every(c=>power(c,main)===p) && n<=8)return make(n===2?1:n===3?4:n<=6?5:n===7?9:10);
    if(cards.some(c=>c.rank>14 || c.rank===14&&c.suit===main))return null;
    if(ranks.has(14)&&ranks.has(2)&&!ranks.has(13)) {ranks.set(1,ranks.get(14));ranks.delete(14);}
    const keys=Array.from(ranks.keys()).sort((a,b)=>a-b),mult=ranks.get(keys[0]);
    if(keys.some((r,i)=>ranks.get(r)!==mult || i>0&&r!==keys[i-1]+1))return null;
    const t=mult===1&&keys.length>=3?2:mult===2&&keys.length>=3?3:mult===3&&keys.length===3?7:mult===4&&keys.length===2?8:-1;
    return t<0?null:make(t,keys[0]);
  }
  function canTake(m,old) {return !!(m&&old&&[4,5,9,10].includes(old.type)&&m.cards.length===old.cards.length-1&&m.cards.length>=2&&m.cards.every(c=>c.rank===4));}
  function beats(m,old) {
    if(!m)return false;if(!old)return true;if(old.type===13)return false;
    if(old.type===0&&old.power===18)return m.type===13||m.type>5||m.type===5&&m.cards.length>=5;
    if(old.type===0&&old.power>=16)return m.type===0?m.power>old.power:m.type>=5;
    if(m.type===0&&m.power>=16)return old.type===0&&m.power>old.power;
    if(old.type===3&&m.type===4)return false;
    if(m.type!==old.type)return m.type>3&&m.type>old.type;
    if(m.type===5&&m.cards.length!==old.cards.length)return m.cards.length>old.cards.length;
    return m.cards.length===old.cards.length&&m.power>old.power;
  }
  function moves(hand,main,old) {
    const groups=new Map(),seq=new Map(),kings=[],out=[],seen=new Set();
    const add=(cards,take=false)=> {
      const m=classify(cards,main);if(!m || !(take?canTake(m,old):beats(m,old)))return;
      const key=cards.map(c=>c.id).sort((a,b)=>a-b).join(',')+':'+take;if(seen.has(key))return;seen.add(key);
      out.push({...m,take});
    };
    hand.forEach(c=> {
      const p=power(c,main);if(!groups.has(p))groups.set(p,[]);groups.get(p).push(c);
      if(c.rank>14)kings.push(c);
      else if(!(c.rank===14&&c.suit===main)){if(!seq.has(c.rank))seq.set(c.rank,[]);seq.get(c.rank).push(c);}
    });
    groups.forEach(g=>{for(let n=1;n<=g.length;n++){add(g.slice(0,n));if(old)add(g.slice(0,n),true);}});
    for(let mask=1;mask<1<<kings.length;mask++)add(kings.filter((c,i)=>mask&(1<<i)));
    if(seq.has(14))seq.set(1,seq.get(14));
    for(let mult=1;mult<=4;mult++)for(let start=1;start<=14;start++) {
      const cards=[];
      for(let end=start;end<=(start===1?13:14);end++) {
        const g=seq.get(end);if(!g||g.length<mult)break;cards.push(...g.slice(0,mult));
        const len=end-start+1;
        if(mult<=2&&len>=3 || mult===3&&len===3 || mult===4&&len===2)add(cards);
        if(mult>=3&&len>=(mult===3?3:2))break;
      }
    }
    return out;
  }
  class Game {
    constructor(mode='dadaa',count=3,random=Math.random) {
      this.mode=mode;this.n=mode==='dadaa'?5:mode==='duijia'?4:count;
      this.main=-1;this.phase=mode==='dadaa'?'declare':'play';this.declarer=-1;this.bright=false;this.soloBright=false;
      this.hands=Array.from({length:this.n},()=>[]);this.revealed=Array(this.n).fill(mode!=='dadaa');
      this.team=Array.from({length:this.n},(_,i)=>mode==='duijia'?i%2:i);this.finished=[];
      this.owner=-1;this.table=null;this.passes=0;this.actions=Array(this.n).fill('');this.seatMoves=Array(this.n).fill(null);
      this.scores=Array(this.n).fill(0);this.over=false;this.history=[];this.played=[];
      const d=deck(mode==='shangyou'?1:2);for(let i=d.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[d[i],d[j]]=[d[j],d[i]];}
      this.starter=Math.floor(random()*this.n);this.turn=this.starter;
      this.dealOrder=d.map((c,i)=>({seat:(this.starter+i)%this.n,id:c.id}));
      d.forEach((c,i)=>this.hands[(this.starter+i)%this.n].push(c));
      if(mode==='dadaa')this.defaultDeclarer=d.findIndex(c=>c.rank===14&&c.suit===1)%this.n,this.defaultDeclarer=(this.starter+this.defaultDeclarer)%this.n;
      this.hands.forEach(h=>sort(h,this.main));
    }
    aceOptions(seat,doubleOnly=false) {
      const hand=this.dealComplete===false?this.visibleHand(seat):this.hands[seat];
      return suits.map((s,i)=>({suit:i,count:hand.filter(c=>c.rank===14&&c.suit===i).length})).filter(x=>x.count>=(doubleOnly?2:1));
    }
    beginDeal() {
      if(this.history.length||this.declarer>=0)throw Error('对局已经开始');
      this.dealCursor=0;this.dealComplete=false;
    }
    visibleHand(seat) {
      if(this.dealComplete!==false)return this.hands[seat].slice();
      const ids=new Set(this.dealOrder.slice(0,this.dealCursor).filter(x=>x.seat===seat).map(x=>x.id));
      return this.hands[seat].filter(c=>ids.has(c.id));
    }
    dealNext() {
      if(this.dealComplete!==false)throw Error('当前不在发牌');
      const x=this.dealOrder[this.dealCursor];if(!x)return null;
      this.dealCursor++;return {seat:x.seat,card:this.hands[x.seat].find(c=>c.id===x.id)};
    }
    finishDeal() {
      if(this.dealComplete!==false||this.dealCursor!==this.dealOrder.length)throw Error('发牌尚未完成');
      this.dealComplete=true;
      if(this.mode==='dadaa'){if(this.declarer<0)this.defaultDeclare();else this.afterDeclare();}
    }
    declare(seat,suit,double=false) {
      if(this.phase!=='declare'||this.declarer>=0)throw Error('当前不能亮A');
      if(!this.aceOptions(seat,double).some(o=>o.suit===suit))throw Error('手中没有所选A');
      this.main=suit;this.declarer=seat;this.soloBright=double;this.revealed[seat]=true;
      this.assignTeams();this.turn=seat;
      if(this.dealComplete!==false)this.afterDeclare();
    }
    afterDeclare() {
      this.phase=this.soloBright?'play':'counter';
      const seat=this.declarer;
      this.counterQueue=Array.from({length:this.n},(_,j)=>(seat+j)%this.n).filter(i=>this.aceOptions(i,true).length);
      if(!this.soloBright&&!this.counterQueue.length)this.partnerStage();
    }
    defaultDeclare() {this.declare(this.defaultDeclarer,1,false);}
    counter(seat,suit) {
      if(this.phase!=='counter'||this.counterQueue[0]!==seat)throw Error('当前不能反A');
      if(suit>=0){if(!this.aceOptions(seat,true).some(o=>o.suit===suit))throw Error('反A需要同花色双A');
        this.main=suit;this.declarer=seat;this.soloBright=true;this.bright=false;this.revealed.fill(false);this.revealed[seat]=true;
        this.assignTeams();this.phase='play';this.turn=seat;
      } else {this.counterQueue.shift();if(!this.counterQueue.length)this.partnerStage();}
    }
    partnerStage() {this.partner=this.team.findIndex((t,i)=>t===0&&i!==this.declarer);this.phase=this.partner>=0?'partner':'play';}
    revealPartner(open) {if(this.phase!=='partner')throw Error('当前不能亮副A');this.bright=!!open;if(open)this.revealed[this.partner]=true;this.phase='play';}
    assignTeams() {this.hands.forEach((h,i)=>{this.team[i]=h.some(c=>c.rank===14&&c.suit===this.main)?0:1;sort(h,this.main);});}
    next(from) {for(let j=1;j<=this.n;j++){const i=(from+j)%this.n;if(this.hands[i].length)return i;}return from;}
    knowsAlly(viewer,other) {
      if(this.mode==='shangyou')return false;
      if(this.mode==='duijia')return this.team[viewer]===this.team[other];
      if(this.team[viewer]===0)return this.team[other]===0&&this.revealed[other];
      const exposed=this.team.every((t,i)=>t!==0||this.revealed[i]);
      return exposed&&this.team[other]===1;
    }
    wind(from) {
      if(this.mode==='shangyou')return this.next(from);
      // User-confirmed final rule: automatic transfer to nearest active teammate,
      // including hidden partners. Public identity does not change the recipient.
      for(let j=1;j<=this.n;j++){const i=(from+j)%this.n;if(this.hands[i].length&&this.team[i]===this.team[from])return i;}
      return this.next(from);
    }
    play(ids,take=false) {
      if(this.over||this.phase!=='play'||this.dealComplete===false)throw Error('当前不能出牌');
      const seat=this.turn;
      if(!ids.length) {
        if(!this.table)throw Error('首出不能不要');
        this.actions[seat]='不要';this.seatMoves[seat]=null;this.passes++;
        const needed=this.hands.filter((h,i)=>i!==this.owner&&h.length).length;
        if(this.passes>=needed) {
          this.turn=this.hands[this.owner].length?this.owner:this.wind(this.owner);this.table=null;this.owner=-1;this.passes=0;
          this.actions.fill('');this.seatMoves.fill(null);
        } else this.turn=this.next(seat);
        return {seat,cards:[],take:false};
      }
      const cards=ids.map(id=>this.hands[seat].find(c=>c.id===id));
      if(cards.some(c=>!c)||new Set(ids).size!==ids.length)throw Error('选牌不在手中');
      const m=classify(cards,this.main);
      if(!(take?canTake(m,this.table):beats(m,this.table)))throw Error(take?'这些4不能取当前的牌':'牌型不合法或不能压过桌面');
      const taken=take?this.table.cards.slice():[];
      if(take){this.hands[seat].push(...taken);const captured=new Set(taken.map(c=>c.id));this.played=this.played.filter(c=>!captured.has(c.id));}
      const removed=new Set(ids);this.hands[seat]=this.hands[seat].filter(c=>!removed.has(c.id));this.played.push(...cards);sort(this.hands[seat],this.main);
      if(cards.some(c=>c.rank===14&&c.suit===this.main))this.revealed[seat]=true;
      this.actions[seat]=(take?'取牌 · ':'')+m.name;this.seatMoves[seat]=m;this.table=m;this.owner=seat;this.passes=0;
      this.history.push({seat,ids:ids.slice(),take,type:m.type});
      if(!this.hands[seat].length)this.finished.push(seat);
      if(this.decided()){this.over=true;this.settle();}else this.turn=this.next(seat);
      return {seat,cards,take,taken};
    }
    decided() {
      if(!this.finished.length)return false;
      if(this.mode==='shangyou')return this.finished.length>=this.n-1;
      const holders=this.team.map((t,i)=>t===0?i:-1).filter(i=>i>=0);
      if(this.mode==='dadaa'&&holders.length===1)return this.soloBright||this.finished.includes(holders[0])||this.finished.length>=this.n-1;
      return [0,1].some(t=>this.hands.every((h,i)=>this.team[i]!==t||!h.length));
    }
    settle() {
      if(this.mode==='shangyou'){this.finished.push(...this.hands.map((h,i)=>i).filter(i=>!this.finished.includes(i)));this.winner=this.finished[0];this.scores[this.finished[0]]=1;this.scores[this.finished[this.n-1]]=-1;return;}
      const holders=this.team.map((t,i)=>t===0?i:-1).filter(i=>i>=0);
      if(this.mode==='dadaa'&&holders.length===1) {
        const solo=holders[0];this.winner=this.finished[0]===solo?0:this.soloBright||!this.finished.includes(solo)?1:-1;
        if(this.winner>=0)this.scores=this.team.map(t=>t===0?(this.winner===0?1:-1)*(this.soloBright?64:32):(this.winner===1?1:-1)*(this.soloBright?16:8));
        return;
      }
      const first=this.team[this.finished[0]];
      this.winner=this.hands.every((h,i)=>this.team[i]!==first||!h.length)?first:-1;
      if(this.mode==='duijia'){if(this.winner>=0)this.scores=this.team.map(t=>t===this.winner?1:-1);return;}
      if(this.winner<0)return;
      const unit=this.winner===0?4-Math.max(...holders.map(i=>this.finished.indexOf(i)+1)):this.finished.includes(this.declarer)?1:this.finished.some(i=>this.team[i]===0)?2:3;
      this.scores=this.team.map((t,i)=>t===0?(this.winner===0?1:-1)*unit*(this.bright?3:i===this.declarer?2:1):(this.winner===1?1:-1)*unit*(this.bright?2:1));
    }
    // Only the acting hand, exposed identities and public counts reach the bot.
    observation(seat) {return {hand:this.hands[seat].slice(),main:this.main,table:this.table,owner:this.owner,seat,mode:this.mode,
      allies:this.hands.map((h,i)=>i===seat||this.knowsAlly(seat,i)),
      ally:this.owner>=0&&this.knowsAlly(seat,this.owner),counts:this.hands.map(h=>h.length),played:this.played.slice(),
      declarer:this.declarer,revealed:this.revealed.slice(),ownTeam:this.team[seat],bright:this.bright,soloBright:this.soloBright,
      finished:this.finished.slice(),passes:this.passes,history:this.history.map(h=>({...h,ids:h.ids.slice()})),searchVersion:1};}
    static restore(data) {const g=Object.create(Game.prototype);return Object.assign(g,data);}
  }
  function residual(hand,main) {
    let rest=hand.slice(),turns=0;
    while(rest.length){const all=moves(rest,main,null);all.sort((a,b)=>b.cards.length-a.cards.length||a.type-b.type||a.power-b.power);
      const m=all[0];if(!m)return 100;const ids=new Set(m.cards.map(c=>c.id));rest=rest.filter(c=>!ids.has(c.id));turns++;
    }return turns;
  }
  function planner(main) {
    const memo=new Map(),budget={left:350};
    function cost(hand) {
      if(!hand.length)return 0;
      const counts=Array(19).fill(0);hand.forEach(c=>counts[power(c,main)]++);const key=counts.join(',');
      if(memo.has(key))return memo.get(key);
      if(budget.left--<=0)return residual(hand,main);
      const all=moves(hand,main,null),anchor=hand[0].id;
      let best=residual(hand,main);
      const lower=Math.ceil(hand.length/Math.max(...all.map(m=>m.cards.length)));
      const covers=all.filter(m=>m.cards.some(c=>c.id===anchor)).sort((a,b)=>b.cards.length-a.cards.length);
      for(const m of covers){const ids=new Set(m.cards.map(c=>c.id));const rest=hand.filter(c=>!ids.has(c.id));
        best=Math.min(best,1+cost(rest));if(best===lower)break;}
      memo.set(key,best);return best;
    }
    return cost;
  }
  function advice(obs) {
    const options=moves(obs.hand,obs.main,obs.table);
    if(!options.length)return {recommended:null,options:[],reason:'没有能压过桌面的牌'};
    const winning=options.find(m=>m.cards.length===obs.hand.length&&!m.take);if(winning)return {recommended:winning,options:[winning,...options.filter(m=>m!==winning)],reason:'可以一次出完手牌'};
    const enemies=obs.counts.filter((n,i)=>n>0&&i!==obs.seat&&!(obs.allies&&obs.allies[i]));
    const danger=enemies.length?Math.min(...enemies):99;
    const coveringAlly=obs.table&&obs.ally&&danger===1&&obs.table.type===0&&obs.table.power<15;
    const urgent=obs.table&&(!obs.ally&&obs.counts[obs.owner]<=2||coveringAlly);
    const estimate=planner(obs.main),base=estimate(obs.hand);
    const initialGroups=new Map();obs.hand.forEach(c=>{const p=power(c,obs.main);initialGroups.set(p,(initialGroups.get(p)||0)+1);});
    const ranked=options.map(m=>{
      const ids=new Set(m.cards.map(c=>c.id));let rest=obs.hand.filter(c=>!ids.has(c.id));
      if(m.take)rest=rest.concat(obs.table.cards);
      const cost=estimate(rest),usedGroups=new Map();m.cards.forEach(c=>{const p=power(c,obs.main);usedGroups.set(p,(usedGroups.get(p)||0)+1);});
      let split=0;usedGroups.forEach((n,p)=>{const total=initialGroups.get(p);if(n<total)split+=total>=4?12:total===3?4:2;});
      let value=-cost*16+m.cards.length*1.5-m.power*.2-(m.type>=5?8:0)-split;
      let reason=cost<=1?'为下一手出完做准备':split===0?'保留组合，减少剩余出牌次数':'整理手牌';
      if(m.take){value+=(base-cost)*10-8;reason=cost<base?'取牌后可以组成更完整的牌型':'取牌后需要更多轮出牌';}
      if(obs.ally)value-=24;
      if(urgent){value+=m.type>=5?22:m.power;reason='拦截快出完的对手';}
      if(!obs.table&&danger===1){value+=m.cards.length>=2?24:m.power*2;reason=m.cards.length>=2?'对手只剩一张，优先出组合牌':'用大单牌限制对手';}
      if(!obs.table&&danger===2&&m.cards.length>=3){value+=12;reason='对手余牌少，优先出较长组合';}
      return {...m,score:value,reason,remainingTurns:cost};
    });
    ranked.sort((a,b)=>b.score-a.score||a.power-b.power||a.cards[0].id-b.cards[0].id);
    const best=ranked[0];
    if(obs.table&&obs.ally&&!urgent)return {recommended:null,options:ranked,reason:'队友占有牌权，建议让牌'};
    // Taking is optional. Reject captures that worsen the hand unless required to block.
    if(obs.table&&!urgent&&best.take&&best.remainingTurns>base)return {recommended:null,options:ranked,reason:'取牌会增加剩余出牌次数，建议不要'};
    return {recommended:best,options:ranked,reason:best.reason};
  }
  function heuristicBot(obs){return advice(obs).recommended;}
  // Determinized search: no real opponent cards enter this function. Each candidate
  // faces the same sampled deals; the simulation uses the actual local rule engine.
  function sampledGame(obs,random) {
    const known=new Set(obs.hand.concat(obs.played).map(c=>c.id));
    const unseen=deck(obs.mode==='shangyou'?1:2).filter(c=>!known.has(c.id));
    if(unseen.length!==obs.counts.reduce((a,b,i)=>a+(i===obs.seat?0:b),0))return null;
    for(let i=unseen.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[unseen[i],unseen[j]]=[unseen[j],unseen[i]];}
    const n=obs.counts.length,hands=obs.counts.map(()=>[]);hands[obs.seat]=obs.hand.slice();
    let k=0;obs.counts.forEach((count,i)=>{if(i!==obs.seat)hands[i]=unseen.slice(k,k+=count);});
    const shownHolders=new Set();
    (obs.history||[]).forEach(h=>{if(h.ids.some(id=>{const c=obs.played.find(c=>c.id===id);return c&&c.rank===14&&c.suit===obs.main;}))shownHolders.add(h.seat);});
    if(obs.mode==='dadaa') {
      const required=new Set(shownHolders);required.add(obs.declarer);
      if(obs.ownTeam===0)required.add(obs.seat);
      obs.revealed.forEach((v,i)=>{if(v)required.add(i);});
      const isAce=c=>c.rank===14&&c.suit===obs.main;
      for(const seat of required) {
        if(shownHolders.has(seat)||hands[seat].some(isAce))continue;
        if(seat===obs.seat||!hands[seat].length)return null;
        const donor=hands.findIndex((h,i)=>i!==obs.seat&&i!==seat&&h.some(isAce)&&
          (!required.has(i)||shownHolders.has(i)||h.filter(isAce).length>1));
        if(donor<0)return null;
        const ai=hands[donor].findIndex(isAce),swap=hands[seat].findIndex(c=>!isAce(c));
        if(swap<0)return null;[hands[donor][ai],hands[seat][swap]]=[hands[seat][swap],hands[donor][ai]];
      }
      if(obs.soloBright)for(let i=0;i<n;i++)if(i!==obs.declarer) {
        while(hands[i].some(isAce)) {
          if(i===obs.seat||obs.declarer===obs.seat)return null;
          const ai=hands[i].findIndex(isAce),swap=hands[obs.declarer].findIndex(c=>!isAce(c));
          if(swap<0)return null;[hands[i][ai],hands[obs.declarer][swap]]=[hands[obs.declarer][swap],hands[i][ai]];
        }
      }
    }
    const team=hands.map((h,i)=>obs.mode==='duijia'?i%2:obs.mode==='shangyou'?i:
      shownHolders.has(i)||h.some(c=>c.rank===14&&c.suit===obs.main)?0:1);
    if(obs.mode==='dadaa')team[obs.declarer]=0;
    const g=Game.restore({mode:obs.mode,n,main:obs.main,phase:'play',declarer:obs.declarer,bright:obs.bright,
      soloBright:obs.soloBright,hands,team,revealed:obs.revealed.slice(),finished:obs.finished.slice(),
      turn:obs.seat,owner:obs.owner,table:obs.table,passes:obs.passes,actions:Array(n).fill(''),seatMoves:Array(n).fill(null),
      scores:Array(n).fill(0),over:false,history:[],played:obs.played.slice()});
    return g;
  }
  function rolloutMove(obs) {
    const all=moves(obs.hand,obs.main,obs.table);if(!all.length)return null;
    const finish=all.find(m=>!m.take&&m.cards.length===obs.hand.length);if(finish)return finish;
    const danger=Math.min(99,...obs.counts.filter((n,i)=>n>0&&i!==obs.seat&&!obs.allies[i]));
    const cover=obs.ally&&danger===1&&obs.table.type===0&&obs.table.power<15;
    if(obs.table&&obs.ally&&!cover)return null;
    const groups=new Map();obs.hand.forEach(c=>groups.set(power(c,obs.main),(groups.get(power(c,obs.main))||0)+1));
    let best=null,value=-Infinity;
    for(const m of all) {
      const used=new Map();m.cards.forEach(c=>used.set(power(c,obs.main),(used.get(power(c,obs.main))||0)+1));
      let split=0;used.forEach((n,p)=>{const total=groups.get(p);if(n<total)split+=total>=4?14:total===3?5:2;});
      let v=m.cards.length*4-split-m.power*.22-(m.type>=5?5:0);
      if(m.take)v-=obs.table.cards.length*5+6;
      if(!obs.table&&danger===1)v+=m.cards.length>1?22:m.power*2;
      if(obs.table&&((!obs.ally&&obs.counts[obs.owner]<=2)||cover))v+=m.power+(m.type>=5?15:0);
      if(v>value){value=v;best=m;}
    }
    // Preserve a costly control combination when the opponent is not near finishing.
    if(obs.table&&!cover&&obs.counts[obs.owner]>2&&value<-8)return null;
    return best;
  }
  function searchAdvice(obs,config={}) {
    const base=advice(obs);
    if(!obs.searchVersion||!obs.revealed||!base.options.length||base.recommended&&base.recommended.cards.length===obs.hand.length&&!base.recommended.take)return base;
    const candidates=base.options.slice(0,config.candidates||5);
    if(obs.table)candidates.push(null);
    if(candidates.length===1)return base;
    let seed=2166136261;for(const c of obs.hand.concat(obs.played)){seed=Math.imul(seed^c.id,16777619)>>>0;}
    seed^=obs.seat*7919+obs.passes;
    const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    const sums=candidates.map(()=>0);let samples=0,steps=0;
    for(let attempt=0;attempt<(config.samples||16)*5&&samples<(config.samples||16);attempt++) {
      const sampled=sampledGame(obs,random);if(!sampled)continue;samples++;
      for(let i=0;i<candidates.length;i++) {
        const g=Game.restore(JSON.parse(JSON.stringify(sampled))),m=candidates[i];
        g.play(m?m.cards.map(c=>c.id):[],!!(m&&m.take));
        let depth=0;
        while(!g.over&&depth++<160){const next=rolloutMove(g.observation(g.turn));g.play(next?next.cards.map(c=>c.id):[],!!(next&&next.take));steps++;}
        let reward=g.over?g.scores[obs.seat]/(obs.mode==='dadaa'?64:1):0;
        if(!g.over){const own=g.hands[obs.seat].length;const rivals=g.hands.filter((h,j)=>g.team[j]!==g.team[obs.seat]);
          reward=(Math.min(30,...rivals.map(h=>h.length))-own)/100;}
        sums[i]+=reward;
      }
    }
    if(!samples)return base;
    const same=(a,b)=>!a&&!b||a&&b&&a.take===b.take&&a.cards.map(c=>c.id).join(',')===b.cards.map(c=>c.id).join(',');
    let index=0,best=-Infinity;
    sums.forEach((sum,i)=>{const v=sum/samples+(same(candidates[i],base.recommended)?.002:0);if(v>best){best=v;index=i;}});
    const chosen=candidates[index];
    const reason=chosen?'模拟后续对局，兼顾牌权与最终积分':'模拟后续对局后，建议让牌';
    return {...base,recommended:chosen,options:chosen?[{...chosen,reason},...base.options.filter(m=>!same(m,chosen))]:base.options,reason,
      search:{samples,steps,values:sums.map(v=>v/samples),selected:index}};
  }
  function bot(obs){return searchAdvice(obs).recommended;}
  function strongSolo(hand,main) {
    const groups=new Map();hand.forEach(c=>{const p=power(c,main);groups.set(p,(groups.get(p)||0)+1);});
    const bombs=Array.from(groups.values()).filter(n=>n>=4).length;
    const kings=hand.filter(c=>c.rank>14).length;
    return residual(hand,main)<=6 && (bombs>=1||kings>=2) || bombs>=2;
  }
  function toUI(c) {return {index:c.id,rank:c.rank,suit:c.suit,shape:c.rank>14?0:c.suit+1,
    value:c.rank>14?c.rank-1:c.rank===14?12:c.rank===2?13:c.rank-2,val:c.rank>14?c.rank+1:c.rank===14?14:c.rank===2?15:c.rank,
    ...(c.rank>14?{king:c.rank-1}:{})};}
  return {Game,bot,advice,searchAdvice,heuristicBot,sampledGame,strongSolo,moves,classify,canTake,beats,power,sort,deck,label,toUI,names,suits};
});
