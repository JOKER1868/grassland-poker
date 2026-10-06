const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const target=path.join(__dirname,'assets/web');
fs.cpSync(path.join(root,'dist/web-mobile'),target,{recursive:true});
for(const name of ['grasslandCore','grasslandAdapter','grasslandWorker'])fs.copyFileSync(path.join(root,'assets/scripts/grassland',name+'.js'),path.join(target,name+'.js'));
const html=fs.readFileSync(path.join(target,'index.html'),'utf8');
fs.writeFileSync(path.join(target,'index.html'),html.replace('</body>','<script src="grasslandCore.js"></script><script src="grasslandAdapter.js"></script>\n</body>'));
// Android Activity already controls fullscreen. Avoid browser fullscreen rejection.
const main=fs.readFileSync(path.join(target,'main.js'),'utf8');
fs.writeFileSync(path.join(target,'main.js'),main.replace(/cc\.view\.enableAutoFullScreen\([^;]*\);/g,'cc.view.enableAutoFullScreen(false);'));
console.log('Prepared offline web assets from pinned upstream build + editable local logic.');
