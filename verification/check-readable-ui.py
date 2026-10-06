"""Desktop layout check at the phone's CSS viewport; does not operate the phone."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

out = Path(__file__).parent
with sync_playwright() as p:
    browser = p.chromium.launch(channel="msedge", headless=True, args=["--no-proxy-server"])
    page = browser.new_page(viewport={"width": 760, "height": 360}, device_scale_factor=3)
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.goto("http://127.0.0.1:8765", wait_until="networkidle")
    page.wait_for_selector(".gl-home")
    page.get_by_role("button", name="打大A · 5人", exact=True).click()
    page.evaluate("""() => {
      const g=new GrasslandCore.Game('dadaa');g.defaultDeclare();
      while(g.phase==='counter')g.counter(g.counterQueue[0],-1);
      if(g.phase==='partner')g.revealPartner(false);
      g.turn=0;g.actions.fill('大蛋子');
      grassland.restore={game:JSON.parse(JSON.stringify(g))};
    }""")
    page.wait_for_function("grassland.room && grassland.game && grassland.ui.cards_node.length>0")
    page.screenshot(path=str(out / "readable-five-desktop.png"))
    result = page.evaluate("""() => {
      const room=grassland.room, rows=[];
      function overlap(a,b){return a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;}
      const names=room.playerNodeList.map(n=>n.getComponent('player_node').nickname_label.node.getBoundingBoxToWorld());
      for(const node of room.playerNodeList){
        const pn=node.getComponent('player_node');
        const role=pn.glLabel.node.getBoundingBoxToWorld(),score=pn.glTotal.node.getBoundingBoxToWorld();
        if(overlap(role,score))throw Error('Identity covers score');
        const covered=names.find(name=>overlap(role,name)||overlap(score,name));
        if(covered)throw Error('Player text covers another name '+JSON.stringify({role,score,covered}));
        if(role.y<0||score.y<0)throw Error('Text cropped below viewport');
        if(!pn.glLabel.isBold||!pn.glTotal.isBold)throw Error('Text is not bold');
        rows.push({identity:pn.glLabel.string,font:pn.glLabel.fontSize,scoreFont:pn.glTotal.fontSize,role,score});
      }
      return {viewport:[innerWidth,innerHeight],players:rows,noScoreOverlap:true,noBottomCropping:true};
    }""")
    result["layout"] = page.evaluate((out / "ui-layout.js").read_text(encoding="utf-8"))
    result["declaration"] = page.evaluate((out / "ui-declaration.js").read_text(encoding="utf-8"))
    page.set_default_timeout(180000)
    result["variants"] = page.evaluate((out / "ui-variants.js").read_text(encoding="utf-8"))
    result["errors"] = errors
    assert not errors, errors
    (out / "readable-five-report.json").write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"fivePlayerFontBounds":True,"layout":result["layout"],"errors":errors}, ensure_ascii=False))
    browser.close()
