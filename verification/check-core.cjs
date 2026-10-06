// Exercise the original algorithm without Cocos or network dependencies.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
let seed = 20261006;
const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
const context = vm.createContext({console: {log(){}, info(){}, warn(){}}, Math: Object.assign(Object.create(Math), {random})});
function load(name) {
  context.module = {exports: {}};
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../assets/servers/ddzServers', name+'.js'), 'utf8'), context, {filename:name});
  return context.module.exports;
}
const Rule = load('gameRule');
const rule = new Rule();
context.G = {gameRule: rule};
const AI = load('AILogic');
const carder = load('carder');
function beats(a,b) {
  return !b || (a.cardKind===rule.KING_BOMB && b.cardKind!==rule.KING_BOMB) ||
    (a.cardKind===rule.BOMB && b.cardKind!==rule.BOMB && b.cardKind!==rule.KING_BOMB) ||
    (a.cardKind===b.cardKind && a.size===b.size && a.val>b.val);
}
const report = {seed:20261006, games:100, completed:0, moves:0, failures:[]};
for(let game=0;game<report.games;game++) {
  const deal = carder.splitThreeCards();
  const landlord=game%3;
  const players=deal.slice(0,3).map((cards,i)=>({userId:String(i), isLandlord:i===landlord, cardList:cards.slice()}));
  players[landlord].cardList.push(...deal[3]);
  players.forEach((p,i)=>{p.nextPlayer=players[(i+1)%3];});
  let turn=landlord, winner=-1, top=null;
  try {
    for(let step=0;step<500;step++,turn=(turn+1)%3) {
      const player=players[turn], ai=new AI(player);
      const lead=winner===-1 || winner===turn;
      const move=lead ? ai.play(players[landlord].cardList.length) : ai.follow(top, players[winner].isLandlord, players[winner].cardList.length);
      if(!move) {if(lead) throw Error('AI passed on lead'); continue;}
      const cards=move.cardList;
      const actual=rule.typeJudge(cards.slice());
      if(!actual || (!lead && !beats(actual,top))) throw Error('Illegal generated move '+JSON.stringify({top,move,actual}));
      if(actual.cardKind!==move.cardKind || actual.val!==move.val || actual.size!==move.size) throw Error('Inconsistent move metadata '+JSON.stringify({move,actual}));
      const used=new Set();
      for(const c of cards) {
        if(used.has(c.index) || !player.cardList.some(x=>x.index===c.index)) throw Error('Duplicate or unowned card');
        used.add(c.index);
      }
      player.cardList=player.cardList.filter(c=>!used.has(c.index));
      top=actual;winner=turn;report.moves++;
      if(!player.cardList.length) {report.completed++;break;}
      if(step===499) throw Error('Game did not terminate');
    }
  } catch(e) {report.failures.push({game, error:e.message});}
}
fs.writeFileSync(path.join(__dirname,'core-report.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({...report,failures:report.failures.slice(0,3)},null,2));
if(report.failures.length) process.exitCode=1;
