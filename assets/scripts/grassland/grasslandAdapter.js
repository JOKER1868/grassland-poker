/* Preserve upstream scenes, prefabs, artwork, sound and selection effects. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports={install:()=>factory(require('grasslandCore'))};
  else factory(root.GrasslandCore);
})(typeof window==='object'?window:globalThis,function(C){
  'use strict';
  if(typeof window==='undefined'||window.__grasslandInstalled)return;
  window.__grasslandInstalled=true;
  const modes={dadaa:'打大A · 五人',duijia:'打对家 · 四人',shangyou:'争上游'};
  const state={mode:'dadaa',count:3,game:null,room:null,ui:null,autoplay:false,timer:null,busy:false,dialog:null,ready:false};
  window.grassland=state;
  function cancelSearch(){if(state.cancelSearch)state.cancelSearch();state.cancelSearch=null;state.hintPending=false;state.epoch=(state.epoch||0)+1;}
  function requestPlan(obs) {
    return new Promise(resolve=>{
      let worker=null,timer=null,done=false;const started=performance.now();
      const finish=plan=>{if(done)return;done=true;clearTimeout(timer);if(worker)worker.terminate();state.cancelSearch=null;resolve(plan);};
      state.cancelSearch=()=>finish(null);
      try {
        worker=new Worker('grasslandWorker.js');
        worker.onmessage=e=>{state.lastSearch={worker:true,elapsedMs:Math.round(performance.now()-started),search:e.data.plan&&e.data.plan.search,error:e.data.error};finish(e.data.plan||C.advice(obs));};
        worker.onerror=e=>{state.lastSearch={worker:false,error:e.message};finish(C.advice(obs));};
        timer=setTimeout(()=>{state.lastSearch={worker:false,error:'search timeout'};finish(C.advice(obs));},3000);
        worker.postMessage(obs);
      } catch(e){finish(C.searchAdvice(obs));}
    });
  }
  function profile(){
    try{const p=JSON.parse(localStorage.getItem('grassland-totals-v1'));if(p&&Array.isArray(p.scores)&&p.scores.length===5&&p.scores.every(Number.isFinite)&&Array.isArray(p.applied))return p;}catch(e){}
    return {scores:[0,0,0,0,0],applied:[],rounds:0};
  }
  function account(g){
    if(!g.over)return profile();
    if(!g.accountingId)g.accountingId=Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
    const p=profile();
    if(!p.applied.includes(g.accountingId)) {
      g.scores.forEach((delta,i)=>{p.scores[i]+=delta;});p.rounds++;p.applied.push(g.accountingId);p.applied=p.applied.slice(-100);
      localStorage.setItem('grassland-totals-v1',JSON.stringify(p));
    }
    persist();return p;
  }
  function req(name){return window.__require(name);}
  function style() {
    const s=document.createElement('style');s.textContent=`
      .gl-overlay{position:fixed;inset:0;z-index:50;display:flex;align-items:center;justify-content:center;background:#100a06aa;font-family:Arial,'Microsoft YaHei',sans-serif;color:#ffedbb}
      .gl-panel{width:min(620px,80vw);max-height:85vh;overflow:auto;border:3px solid #cca159;border-radius:18px;background:linear-gradient(#53351f,#251b16);padding:20px;text-align:center;box-shadow:0 8px 40px #000a}
      .gl-panel h2{margin:0 0 12px;font-size:24px}.gl-panel p{line-height:1.6;margin:8px}
      .gl-home{background:radial-gradient(ellipse at top,#855c32,#291c13 75%)}
      .gl-home .gl-panel{width:min(660px,86vw);border-color:#d9b770;box-shadow:0 8px 40px #0008}
      .gl-home .gl-panel h2{font-size:28px}
      .gl-home .gl-panel p{margin-bottom:18px}
      .gl-btn{border:2px solid #eed69a;border-radius:18px;padding:10px 22px;background:linear-gradient(#f7d071,#b97122);color:#44220b;font-size:18px;font-weight:bold;margin:6px;cursor:pointer}
      .gl-btn:disabled{filter:grayscale(1);opacity:.45;cursor:default}
      #gl-bar{position:fixed;top:8px;right:8px;z-index:30;display:flex;gap:6px;font:14px Arial;color:#ffedbb}
      #gl-bar button{font-size:14px;padding:6px 12px;margin:0}
      #gl-back{position:fixed;top:8px;left:8px;z-index:30;font-size:14px;padding:6px 12px;margin:0}
      #gl-tip{position:fixed;top:53%;left:18%;width:64%;text-align:center;pointer-events:none;z-index:29;color:#fff0bc;text-shadow:0 2px 4px #000;font: bold 15px Arial}
      #gl-declare{position:fixed;top:61%;left:16%;width:68%;height:38px;z-index:30;display:flex;gap:6px;overflow-x:auto;align-items:center;color:#ffedbb;font:14px Arial;white-space:nowrap}
      #gl-declare button{font-size:18px;padding:6px 12px;margin:0;flex-shrink:0}
      .gl-overlay{font-family:'Microsoft YaHei','Noto Sans CJK SC',sans-serif;font-weight:700}
      .gl-panel{padding:18px 22px;border-radius:20px}
      .gl-panel h2,.gl-home .gl-panel h2{font-size:30px;font-weight:900;letter-spacing:1px;color:#fff4cf;text-shadow:0 2px 3px #160d05}
      .gl-panel p{font-size:20px;line-height:1.5;white-space:pre-line;color:#fff3d5}
      .gl-btn{font-size:22px;font-weight:800;text-shadow:0 1px 0 #fff4c080}
      #gl-bar button,#gl-back{font-size:18px;font-weight:800;padding:7px 14px}
      #gl-tip{font-size:18px;line-height:22px;font-weight:800;color:#fff7dc;text-shadow:0 2px 3px #201005,1px 0 2px #201005,-1px 0 2px #201005}
      #gl-declare{top:59%;height:44px;font-size:18px;font-weight:800}
      #gl-mode{position:fixed;top:19px;left:94px;z-index:29;font:800 16px 'Microsoft YaHei',sans-serif;color:#fff3d5;text-shadow:0 2px 3px #201005;pointer-events:none}
    `;document.head.appendChild(s);
  }
  function button(text,fn){const b=document.createElement('button');b.className='gl-btn';b.textContent=text;b.onclick=fn;return b;}
  function closeDialog(){if(state.dialog){state.dialog.remove();state.dialog=null;}}
  function dialog(title,text,options){
    closeDialog();const cover=document.createElement('div');cover.className='gl-overlay';const panel=document.createElement('div');panel.className='gl-panel';
    const h=document.createElement('h2');h.textContent=title;panel.appendChild(h);const p=document.createElement('p');p.textContent=text;panel.appendChild(p);
    options.forEach(o=>panel.appendChild(button(o.text,()=>{closeDialog();o.run();})));
    cover.appendChild(panel);document.body.appendChild(cover);state.dialog=cover;
  }
  function saved(){try{return JSON.parse(localStorage.getItem('grassland-save-v1'));}catch(e){return null;}}
  function persist(){if(state.game)localStorage.setItem('grassland-save-v1',JSON.stringify({mode:state.mode,count:state.count,game:state.game}));}
  function chooseMode(){
    const options=[{text:'打大A · 5人',run:()=>enter('dadaa',5)},{text:'打对家 · 4人',run:()=>enter('duijia',4)},
      {text:'争上游 · 3人',run:()=>enter('shangyou',3)},{text:'争上游 · 2人',run:()=>enter('shangyou',2)}];
    const save=saved();if(save&&!save.game.over)options.push({text:'继续上局',run:()=>enter(save.mode,save.count,save)});
    dialog('选择玩法','累计积分 '+profile().scores[0]+' 分',options);
    state.dialog.classList.add('gl-home');
  }
  function enter(mode,count,save){
    state.mode=mode;state.count=count;state.restore=save;state.ready=false;
    const p=window.myglobal.playerData;p.roomId='1_1_grassland';p.seatindex=0;p.userName='你';
    p.rootList=Array.from({length:Math.max(2,(mode==='dadaa'?5:mode==='duijia'?4:count)-1)},(_,j)=>({seatindex:j+1,userId:'bot_'+(j+1),userName:'机器人'+(j+1),avatarUrl:'avatar_'+(j%3+2),goldcount:profile().scores[j+1]}));
    cc.director.loadScene('gameScene');
  }
  function labelNode(name,parent,text,x,y,size=22){
    const n=new cc.Node(name);n.parent=parent;n.setPosition(x,y);const l=n.addComponent(cc.Label);l.fontSize=size;l.lineHeight=size+4;l.isBold=true;l.string=text;n.color=new cc.Color(255,245,215);
    const outline=n.addComponent(cc.LabelOutline);outline.color=new cc.Color(40,22,12);outline.width=2;return l;
  }
  function actionButtons(ui) {
    const row=ui.playingUI_node,source=row.getChildByName('btn_chupai');
    const take=cc.instantiate(source);take.name='btn_take';take.parent=row;
    const event=new cc.Component.EventHandler();event.target=ui.node;event.component='gameingUI';event.handler='onButtonClick';event.customEventData='takecard';
    take.getComponent(cc.Button).clickEvents=[event];ui.glTake=take;
    const specs=[['btn_buchu_node','不出'],['btn_tisji','提示'],['btn_chupai','出牌'],['btn_take','取牌']];
    specs.forEach(([name,text],i)=>{
      const n=row.getChildByName(name);n.setPosition((i-1.5)*210,-90);n.scale=.8;
      const sprite=n.getComponent(cc.Sprite);if(sprite)sprite.enabled=false;
      n.getComponent(cc.Button).transition=cc.Button.Transition.NONE;
      const face=new cc.Node('actionFace');face.parent=n;const draw=face.addComponent(cc.Graphics);
      draw.fillColor=new cc.Color(37,172,223);draw.roundRect(-100,-42,200,84,42);draw.fill();
      draw.fillColor=new cc.Color(85,218,246);draw.roundRect(-94,0,188,36,18);draw.fill();
      draw.strokeColor=new cc.Color(179,240,255);draw.lineWidth=2;draw.roundRect(-99,-41,198,82,41);draw.stroke();
      const label=labelNode('actionText',n,text,0,0,40);label.node.color=cc.Color.WHITE;
      label.node.getComponent(cc.LabelOutline).color=new cc.Color(25,83,136);
    });
    row.y=-38;row.scale=.82;
  }
  function roomPatch(room){
    state.room=room;state.ui=room.gameUiNode.getComponent('gameingUI');const ui=state.ui;
    const data=req('ddzData'),server=req('ddzServers');
    // Scene destruction is deferred: listeners belonging to the previous room
    // can survive until the end of this frame. The replacement owns game state.
    data.gameStateNotify._listeners.slice().forEach(listener=>{
      if(listener.target instanceof cc.Component)data.gameStateNotify.removeListener(listener.callback,listener.target);
    });
    data.gameStateNotify.removeListener(server.gameStateHandler,server);
    data.gameStateNotify.removeListener(room.gameStateHandler,room);
    data.gameStateNotify.removeListener(ui.gameStateHandler,ui);
    ['canrob_state_notify','playAHandNotify','nextPlayerNotify'].forEach(e=>window.$socket.remove(e,server));
    room.roomid_label.string=modes[state.mode];room.di_label.string='完全离线';room.beishu_label.string='';
    [room.roomid_label,room.di_label].forEach(l=>{l.fontSize=30;l.lineHeight=34;l.isBold=true;});
    room.btn_ready.getComponentsInChildren(cc.Label).forEach(l=>{l.fontSize=40;l.lineHeight=44;l.isBold=true;});
    const oldBack=room.node.getChildByName('goBack');if(oldBack)oldBack.active=false;
    const heading=room.node.getChildByName('gz_empty_node');if(heading)heading.active=false;
    const n=state.mode==='dadaa'?5:state.mode==='duijia'?4:state.count,seatRoot=room.players_seat_pos;
    room.playerNodeList.forEach(p=>p.destroy());room.playerNodeList=[];
    // The upstream seat container also owns the human hand and bottom-card nodes.
    // Preserve those prefabs before replacing the seat positions.
    ui.cardsNode.parent=ui.node;ui.cardsNode.setPosition(0,0);
    ui.bottom_card_pos_node.parent=ui.node;
    seatRoot.children.slice().forEach(s=>{s.removeFromParent();s.destroy();});
    const positions=n===5?[[ -650,-195],[535,30],[535,195],[-535,195],[-535,30]]:
      n===4?[[-650,-195],[535,125],[0,245],[-535,125]]:
      n===3?[[-650,-195],[535,170],[-535,170]]:[[-650,-195],[0,245]];
    const players=[window.myglobal.playerData,...window.myglobal.playerData.rootList.slice(0,n-1)];
    for(let i=0;i<n;i++) {
      const seat=new cc.Node('seat_'+i);seat.parent=seatRoot;seat.setPosition(...positions[i]);
      const zone=new cc.Node('cardsoutzone');zone.parent=seat;
      const topSeat=i>0&&(n===2||n===4&&i===2);
      zone.setPosition(i===0?650:topSeat?0:i===1||n===5&&i===2?-220:220,i===0?195:topSeat?-165:-15);
      room.addPlayerNode(players[i]);
      const pn=room.playerNodeList[i].getComponent('player_node');pn.node.scale=i===0?.75:.7;
      pn.card_node.x=i===0?0:i===1||n===5&&i===2?-150:150;pn.card_node.y=0;
      pn.masterIcon.active=false;pn.readyimage.active=false;pn.qiangdidzhu_node.active=false;
      pn.card_node.removeAllChildren();pn.cardlist_node=[];
      pn.glLabel=labelNode('identity',seat,'',0,-92,26);
      pn.glTotal=labelNode('total',seat,'累计 '+profile().scores[i]+' 分',0,-46,24);
      pn.glAction=labelNode('lastAction',seat,'',zone.x,zone.y+(i===0?90:-80),22);
      data.gameStateNotify.removeListener(pn.gameStateHandler,pn);
      pn.pushCard=function(){};pn.gameEndNotify=function(){};pn.canrobNotify=function(){};
      window.$socket.remove('canrob_notify',pn);window.$socket.remove('gameEndNotify',pn);
    }
    ui.unscheduleAllCallbacks();ui.robUI.active=false;ui.timeLabel.node.active=false;ui.bottom_card_pos_node.active=false;ui.winNode.active=false;ui.loseNode.active=false;
    actionButtons(ui);
    ui.tipsLabel.node.active=false;ui.tipsLabel.string='';
    window.$socket.remove('canrob_notify',ui);window.$socket.remove('pushcard_notify',ui);window.$socket.remove('selfPlayAHandNotify',ui);window.$socket.remove('rootPlayAHandNotify',ui);window.$socket.remove('gameEndNotify',ui);
    ui.onButtonClick=function(event,kind){
      const g=state.game;if(!g||g.over||g.phase!=='play'||g.turn!==0||state.busy)return;
      if(kind==='tipcard')hint();
      else if(kind==='nopushcard')act([]);
      else if(kind==='pushcard')act(ui.choose_card_data.map(c=>c.index),false);
      else if(kind==='takecard')act(ui.choose_card_data.map(c=>c.index),true);
    };
    ui.updateCards=function(){layoutCards();};
    room.onBtnReadey=()=>start();
    room.onGoback=()=>{persist();clearTimeout(state.timer);cancelSearch();state.room=null;state.ui=null;closeDialog();controls(false);cc.director.loadScene('hallScene');};
    ui.glTip=labelNode('turnStatus',room.node,'',0,306,28);
    controls(true);
    if(state.restore){state.game=C.Game.restore(state.restore.game);state.restore=null;state.ready=true;room.btn_ready.active=false;
      if(state.game.dealComplete===false)dealAnimation();else {renderHand();renderSeats();advance();}}
    else {room.btn_ready.active=true;ui.playingUI_node.active=false;state.game=null;document.getElementById('gl-tip').textContent='点击准备开始';}
  }
  function controls(active){
    ['gl-bar','gl-back','gl-mode','gl-take','gl-tip'].forEach(id=>{const old=document.getElementById(id);if(old)old.remove();});
    if(!active){const declaration=document.getElementById('gl-declare');if(declaration)declaration.remove();}
    if(!active)return;
    const back=button('返回',()=>state.room.onGoback());back.id='gl-back';document.body.appendChild(back);
    const mode=document.createElement('div');mode.id='gl-mode';mode.textContent=state.mode==='shangyou'?'争上游 · '+state.count+'人':modes[state.mode];document.body.appendChild(mode);
    const bar=document.createElement('div');bar.id='gl-bar';
    bar.appendChild(button('规则',()=>rules()));bar.appendChild(button(state.autoplay?'取消托管':'托管',()=>{state.autoplay=!state.autoplay;controls(true);if(!state.busy)advance();}));
    bar.appendChild(button('清除',()=>clearSelection()));document.body.appendChild(bar);
    const tip=document.createElement('div');tip.id='gl-tip';document.body.appendChild(tip);
  }
  function rules(){if(!state.busy){clearTimeout(state.timer);cancelSearch();}dialog('玩法说明','4最小，3大于2。普通单张、对子和龙不跨型压制；蛋子不能管双龙。对4取三张蛋子，三张4取四张大蛋子，必须点击“取牌”。龙允许A-2-3，不允许K-A-2。打大A可以同花双A反主；亮双A后独打，只有头贡获胜。暗独打二至四贡为平局。',[{text:'继续游戏',run:()=>{if(!state.busy)advance();}}]);}
  function start(){
    cancelSearch();
    clearTimeout(state.timer);closeDialog();state.game=new C.Game(state.mode,state.count);state.ready=true;state.busy=false;
    state.game.beginDeal();persist();
    state.room.btn_ready.active=false;state.ui.winNode.active=false;state.ui.loseNode.active=false;
    state.room.playerNodeList.forEach(p=>{p.getComponent('player_node').unscheduleAllCallbacks();});
    state.ui.cardsNode.removeAllChildren();state.ui.cards_node=[];
    state.ui.playingUI_node.active=false;
    dealAnimation();
  }
  function dealAnimation(){
    const g=state.game,room=state.room,ui=state.ui;state.busy=true;
    const dealt=Array.from({length:g.n},(_,i)=>g.visibleHand(i));state.dealCounts=dealt.map(h=>h.length);
    const byId=new Map(g.hands.flat().map(c=>[c.id,c]));
    const sequence=g.dealOrder.map(x=>({seat:x.seat,card:byId.get(x.id)}));
    renderHand(dealt[0]);renderSeats();ui.glTip.string='正在发牌';
    const deck=cc.instantiate(ui.card_prefab);deck.parent=ui.node;deck.scale=.45;deck.setPosition(0,75);deck.zIndex=2000;
    deck.getChildByName('count').active=true;
    let index=g.dealCursor||0;
    let choiceKey=null;
    function choices(){
      const opts=g.mode==='dadaa'&&g.declarer<0&&!state.autoplay?g.aceOptions(0):[];
      const key=JSON.stringify(opts);if(choiceKey===key)return;choiceKey=key;
      const old=document.getElementById('gl-declare');if(old)old.remove();if(!opts.length)return;
      const row=document.createElement('div');row.id='gl-declare';const caption=document.createElement('span');caption.textContent='抢亮主A';row.appendChild(caption);
      for(const o of opts)for(const double of o.count>=2?[false,true]:[false])row.appendChild(button((double?'亮双 ':'亮 ')+C.suits[o.suit]+'A',()=>{
        if(state.game!==g||state.room!==room||!state.busy||g.declarer>=0)return;
        g.declare(0,o.suit,double);renderHand(dealt[0]);renderSeats();persist();choices();
      }));
      document.body.appendChild(row);
    }
    choices();
    function tick(){
      if(state.game!==g||state.room!==room){if(cc.isValid(deck))deck.destroy();return;}
      if(index>=sequence.length){
        deck.destroy();state.timer=setTimeout(()=>{if(state.game!==g||state.room!==room)return;
          const row=document.getElementById('gl-declare');if(row)row.remove();g.finishDeal();
          state.busy=false;state.dealCounts=null;renderHand();renderSeats();advance();},250);return;
      }
      const {seat,card}=g.dealNext();index=g.dealCursor;dealt[seat].push(card);state.dealCounts[seat]++;
      if(g.mode==='dadaa'&&g.declarer<0&&(seat!==0||state.autoplay)&&dealt[seat].length>=16){
        const o=g.aceOptions(seat).find(o=>C.strongSolo(dealt[seat],o.suit));if(o)g.declare(seat,o.suit,o.count>=2);
      }
      deck.getChildByName('count').getComponent(cc.Label).string=sequence.length-index;
      const fly=cc.instantiate(ui.card_prefab);fly.parent=ui.node;fly.scale=.45;fly.setPosition(0,75);fly.zIndex=2001;
      const at=room.players_seat_pos.children[seat].position;
      fly.runAction(cc.sequence(cc.moveTo(.16,cc.v2(seat===0?0:at.x,seat===0?-245:at.y)),cc.fadeOut(.05),cc.removeSelf()));
      if(seat===0){renderHand(dealt[0]);common.audio.PlayEffect(ui.fapaiAudio);}
      renderSeats();ui.glTip.string='正在发牌 · '+index+'/'+sequence.length+(g.declarer>=0?' · '+(g.declarer===0?'你':'机器人'+g.declarer)+'亮 '+C.suits[g.main]+'A':'');choices();
      if(index%g.n===0)persist();
      state.timer=setTimeout(tick,g.n===5?36:50);
    }
    tick();
  }
  function clearSelection(){if(!state.ui)return;state.ui.cards_node.forEach(n=>n.emit('reset_card_flag'));state.ui.choose_card_data=[];state.ui.tipsLabel.string='';}
  function layoutCards(){
    const ui=state.ui;if(!ui)return;const cards=ui.cards_node;if(!cards.length)return;
    const width=cards[0].width*.8,step=Math.min(width*.42,(1050-width)/Math.max(1,cards.length-1));
    cards.forEach((n,i)=>{n.zIndex=i;n.setPosition(-((cards.length-1)*step)/2+i*step,-245+(n.getComponent('card').flag?20:0));});
  }
  function renderHand(partial){
    const ui=state.ui,g=state.game;
    C.sort(g.hands[0],g.main);
    const displayed=partial===undefined?g.hands[0]:C.sort(partial.slice(),g.main);
    const existing=new Map(ui.cards_node.filter(n=>cc.isValid(n)).map(n=>[n.getComponent('card').caardIndex,n]));
    const kept=new Set(displayed.map(c=>c.id));
    ui.choose_card_data=ui.choose_card_data.filter(c=>kept.has(c.index));
    for(const [id,n] of existing)if(!kept.has(id)){n.removeFromParent();n.destroy();}
    ui.cards_node=displayed.map(c=>{if(existing.has(c.id))return existing.get(c.id);
      const n=cc.instantiate(ui.card_prefab);n.parent=ui.cardsNode;n.scale=.8;n.active=true;n.getChildByName('count').active=false;
      const card=n.getComponent('card');card.showCards(C.toUI(c),window.myglobal.playerData.userId);ui.card_width=n.width;
      n.off(cc.Node.EventType.TOUCH_START);
      n.on(cc.Node.EventType.TOUCH_START,()=>{
        if(state.busy||state.dialog||state.autoplay||state.game!==g||g.phase!=='play'||g.over)return;
        card.flag=!card.flag;n.y+=card.flag?20:-20;
        if(card.flag)ui.choose_card_data.push(card.card_data);else ui.choose_card_data=ui.choose_card_data.filter(x=>x.index!==c.id);
        ui.tipsLabel.string='';selectionState();
      });
      // The original touch effect is retained. Slide movement selects each crossed card once.
      n.on(cc.Node.EventType.TOUCH_MOVE,e=>{if(state.busy||state.dialog||state.autoplay||g.phase!=='play'||g.over)return;const at=e.getLocation();
        for(let i=ui.cards_node.length-1;i>=0;i--){const target=ui.cards_node[i],bounds=target.getBoundingBoxToWorld();if(bounds.contains(at)){const tc=target.getComponent('card');if(!tc.flag)target.emit(cc.Node.EventType.TOUCH_START);break;}}
      });
      return n;
    });layoutCards();
  }
  function renderSeats(){
    const g=state.game,room=state.room,ui=state.ui;if(!g||!room)return;
    room.playerNodeList.forEach((node,i)=>{
      const pn=node.getComponent('player_node'),count=state.dealCounts?state.dealCounts[i]:g.hands[i].length;
      pn.nickname_label.string=i===0?'你':'机器人'+i;pn.nickname_label.fontSize=30;pn.nickname_label.lineHeight=34;pn.nickname_label.isBold=true;pn.globalcount_label.string='累计 '+profile().scores[i];pn.globalcount_label.fontSize=24;pn.globalcount_label.isBold=true;pn.clockimage.active=false;pn.masterIcon.active=false;
      pn.glTotal.string='累计 '+profile().scores[i]+' 分';
      pn.node.color=new cc.Color(255,255,255);
      if(g.turn===i&&!g.over&&g.phase==='play')pn.glLabel.node.color=new cc.Color(255,211,67);
      else pn.glLabel.node.color=g.mode==='duijia'&&g.team[i]===g.team[0]?new cc.Color(124,235,224):new cc.Color(255,235,185);
      const rank=g.finished.indexOf(i);
      const publicTeams=g.mode!=='dadaa'||g.team.every((t,j)=>t!==0||g.revealed[j]);
      const role=g.mode==='dadaa'?(i===g.declarer?'主方':g.revealed[i]&&g.team[i]===0?'副A':i===0||publicTeams?(g.team[i]===0?'副A · 暗打':'抓方'):'身份未公开'):
        g.mode==='duijia'?(i===0?'你方':g.team[i]===g.team[0]?'队友 · 对家':'对手'):'各自为战';
      const visibleRole=state.busy&&g.mode==='dadaa'?(i===g.declarer?'主方':'等待亮主'):role;
      pn.glLabel.string=(rank>=0?'第'+(rank+1)+'贡 ':'')+visibleRole;
      pn.glAction.string=g.actions[i]||'';
      if(i>0){if(!pn.cardlist_node.length){const back=cc.instantiate(ui.card_prefab);back.parent=pn.card_node;back.scale=.48;pn.cardlist_node=[back];}
        pn.cardlist_node[0].getChildByName('count').active=true;pn.cardlist_node[0].getChildByName('count').getComponent(cc.Label).string=count;pn.card_node.active=count>0;}
      const zone=room.getUserOutCardPosByAccount(pn.userId),m=g.seatMoves[i],key=m?m.cards.map(c=>c.id).join(','):'';
      if(pn.glMoveKey!==key){pn.glMoveKey=key;zone.removeAllChildren();
        if(m){const ns=m.cards.map(c=>{const n=cc.instantiate(ui.card_prefab);n.getComponent('card').showCards(C.toUI(c),'played');n.getChildByName('count').active=false;return n;});ui.appendOtherCardsToOutZone(zone,ns,0);
          const scale=i===0?.48:.43,width=ns[0].width*scale,limit=i===0?330:220;
          const step=Math.min(24,(limit-width)/Math.max(1,ns.length-1));
          ns.forEach((n,j)=>{n.scale=scale;n.x=(j-(ns.length-1)/2)*step;n.y=0;});}}
    });
    const main=g.main>=0?C.suits[g.main]+'A':'';ui.glTip.string=g.phase==='play'&&!g.over?(main?'主A '+main+' · ':'')+(g.turn===0?'轮到你出牌':'机器人'+g.turn+'思考中'):'';
    ui.playingUI_node.active=!state.busy&&g.phase==='play'&&!g.over&&g.turn===0&&!state.autoplay;
    if(!state.busy)persist();
  }
  function selectionState(){
    if(!state.game||!state.ui)return;
    const bar=document.getElementById('gl-bar');if(bar)for(const b of bar.children)if(['规则','清除'].includes(b.textContent))b.disabled=state.busy;
    const g=state.game,ids=state.ui.choose_card_data.map(c=>c.index),cards=ids.map(id=>g.hands[0].find(c=>c.id===id)).filter(Boolean),m=C.classify(cards,g.main);
    const yourTurn=!state.busy&&g.phase==='play'&&!g.over&&g.turn===0&&!state.autoplay;
    state.ui.playingUI_node.getComponentsInChildren(cc.Button).forEach(b=>{const kind=b.clickEvents[0]&&b.clickEvents[0].customEventData;
      if(kind==='pushcard')b.interactable=yourTurn&&C.beats(m,g.table);
      if(kind==='nopushcard')b.interactable=yourTurn&&!!g.table;
      if(kind==='tipcard')b.interactable=yourTurn;
      if(kind==='takecard')b.interactable=yourTurn&&C.canTake(m,g.table);
      b.node.opacity=b.interactable?255:105;
    });
    const tip=document.getElementById('gl-tip');if(tip)tip.textContent=yourTurn?(state.ui.tipsLabel.string|| (ids.length?(m?m.name+' · '+ids.length+'张':'选牌不能组成合法牌型'):'点击或滑动选牌')):'';
  }
  async function hint(){
    const g=state.game;if(state.hintPending||!g||g.turn!==0)return;clearSelection();
    const epoch=state.epoch;state.hintPending=true;
    state.ui.tipsLabel.string='正在分析出牌…';
    const plan=await requestPlan(g.observation(0));state.hintPending=false;
    if(!plan||state.game!==g||state.epoch!==epoch||g.turn!==0||state.autoplay)return;
    state.hintIndex=state.hintIndex||0;
    if(!plan.options.length){state.ui.tipsLabel.string=plan.reason;return;}
    if(!plan.recommended&&state.hintIndex===0){state.hintIndex++;state.ui.tipsLabel.string=plan.reason+'；再点提示查看可出牌';return;}
    const offset=plan.recommended?state.hintIndex:state.hintIndex-1;
    const m=plan.options[offset%plan.options.length];state.hintIndex++;state.ui.tipsLabel.string=(m.take?'建议点击取牌 · ':'')+m.reason;
    const ids=new Set(m.cards.map(c=>c.id));state.ui.cards_node.forEach(n=>{if(ids.has(n.getComponent('card').caardIndex))n.emit(cc.Node.EventType.TOUCH_START);});state.ui.tipsLabel.string=(m.take?'建议点击取牌 · ':'')+m.reason;selectionState();
  }
  function act(ids,take=false){
    const g=state.game;if(!g||state.busy||g.phase!=='play'||g.over)return;
    try {const human=g.turn===0;g.play(ids,take);state.hintIndex=0;if(human)clearSelection();renderHand();renderSeats();advance();}catch(e){state.ui.tipsLabel.string=e.message;setTimeout(()=>{if(state.ui)state.ui.tipsLabel.string='';},1800);}
  }
  function advance(){
    const g=state.game;if(!g||!state.room||state.busy)return;clearTimeout(state.timer);cancelSearch();persist();
    if(g.over){const totals=account(g);renderSeats();state.ui.playingUI_node.active=false;const won=g.mode==='shangyou'?g.winner===0:g.winner>=0&&g.team[0]===g.winner;
      state.ui.winNode.active=won;state.ui.loseNode.active=g.winner>=0&&!won;
      const title=g.winner<0?'平局':won?'你方获胜':'对方获胜';
      dialog(title,g.hands.map((h,i)=>(i===0?'你':'机器人'+i)+'：'+(g.finished.includes(i)?(g.finished.indexOf(i)+1)+'贡':'未出完')+'  本局 '+(g.scores[i]>=0?'+':'')+g.scores[i]+'  累计 '+totals.scores[i]+'分').join('\n'),[{text:'再来一局',run:()=>start()},{text:'返回玩法',run:()=>state.room.onGoback()}]);return;}
    if(g.phase==='declare') {
      const options=g.aceOptions(0).flatMap(o=>[{text:'亮 '+C.suits[o.suit]+'A',run:()=>{g.declare(0,o.suit);renderHand();advance();}},...(o.count===2?[{text:'亮双 '+C.suits[o.suit]+'A',run:()=>{g.declare(0,o.suit,true);renderHand();advance();}}]:[])]);
      options.push({text:'不亮',run:()=>{const seat=Array.from({length:g.n},(_,j)=>(g.starter+j)%g.n).find(i=>i!==0&&g.aceOptions(i).length);
        if(seat!==undefined){const o=g.aceOptions(seat).sort((a,b)=>b.count-a.count)[0];g.declare(seat,o.suit,o.count===2&&C.strongSolo(g.hands[seat],o.suit));}else g.defaultDeclare();renderHand();advance();}});
      dialog('亮A','选择主A花色；同花双A可选择明独打。',options);return;
    }
    if(g.phase==='counter') {
      const seat=g.counterQueue[0];if(seat===0){dialog('反A','当前主A：'+C.suits[g.main]+'A。任意同花色双A可反，只有一次反牌。',[
        ...g.aceOptions(0,true).map(o=>({text:'反 '+C.suits[o.suit]+'A',run:()=>{g.counter(0,o.suit);renderHand();advance();}})),{text:'不反',run:()=>{g.counter(0,-1);advance();}}]);return;}
      state.timer=setTimeout(()=>{const o=g.aceOptions(seat,true).find(o=>C.strongSolo(g.hands[seat],o.suit));g.counter(seat,o?o.suit:-1);renderHand();advance();},800);return;
    }
    if(g.phase==='partner') {
      if(g.partner===0){dialog('副A明暗打','你持有另一张主A。亮出身份后明打，也可以暗打。',[{text:'亮副A · 明打',run:()=>{g.revealPartner(true);advance();}},{text:'不亮 · 暗打',run:()=>{g.revealPartner(false);advance();}}]);return;}
      g.revealPartner(false);
    }
    closeDialog();renderSeats();selectionState();
    if(g.turn!==0||state.autoplay){const epoch=state.epoch,seat=g.turn;state.timer=setTimeout(async()=>{if(!state.room||g.over||state.epoch!==epoch)return;
      const plan=await requestPlan(g.observation(seat));if(!plan||state.game!==g||state.epoch!==epoch||g.turn!==seat||seat===0&&!state.autoplay)return;
      const m=plan.recommended;act(m?m.cards.map(c=>c.id):[],m?m.take:false);},state.autoplay?350:950);}
  }
  let lastScene=null;
  style();
  const canvas=document.getElementById('GameCanvas');if(canvas)canvas.style.visibility='hidden';
  setInterval(()=>{
    if(!window.cc||!cc.director||!window.myglobal)return;
    const scene=cc.director.getScene();if(!scene)return;
    if(scene!==lastScene){lastScene=scene;clearTimeout(state.timer);cancelSearch();state.busy=false;
      const room=scene.getComponentsInChildren('gameScene')[0],hall=scene.getComponentsInChildren('hallScene')[0];
      if(room){if(canvas)canvas.style.visibility='visible';setTimeout(()=>roomPatch(room),100);}
      else if(hall){state.room=null;state.ui=null;controls(false);if(canvas)canvas.style.visibility='hidden';
        hall.node.active=false;
        chooseMode();
      } else if(scene.getComponentsInChildren('loginScene').length){
        const p=window.myglobal.playerData;p.userId=p.userId||'local_player';p.userName='你';
        cc.sys.localStorage.setItem('userData',JSON.stringify(p));cc.director.loadScene('hallScene');
      }
    }
    selectionState();
  },100);
});
