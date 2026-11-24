'use strict';
(()=>{
let N=21, RANGE=4, COL={}, TOWERS={}, WAVES=[], KEYS=[];
const cv=document.getElementById('cv');let ctx=cv.getContext('2d');
const $=id=>document.getElementById(id);
const inspectEl=$('insp'),iconCache=new Map();
const spriteImages={};
const archerSheet=document.createElement('img');
const terrainTexture=document.createElement('img');
const environmentImages={};
const enemyImages={};
function loadThemeImages(){
  for(const key of Object.keys(enemyImages))delete enemyImages[key];
  for(const [key,asset] of Object.entries(CrusaderAssets.theme.enemies.images||{})){
    const image=document.createElement('img');image.src=asset.url;enemyImages[key]=image;
  }
  for(const key of Object.keys(spriteImages))delete spriteImages[key];
  const refresh=()=>{iconCache.clear();towerListSignature='';if(S){renderPanel();renderTowerCards();}};
  if(CrusaderAssets.theme.terrain.texture){terrainTexture.src=CrusaderAssets.theme.terrain.texture.url;}
  else terrainTexture.removeAttribute('src');
  for(const key of Object.keys(environmentImages))delete environmentImages[key];
  for(const [key,asset] of Object.entries({...CrusaderAssets.theme.terrain.environment,...CrusaderAssets.theme.terrain.images})){
    const image=document.createElement('img');image.src=asset.url;environmentImages[key]=image;
  }
  archerSheet.onload=refresh;archerSheet.src=CrusaderAssets.imageSource('archerAnimation');
  for(const [key,asset] of Object.entries(CrusaderAssets.theme.towers.images)){
    if(key==='archerAnimation'){spriteImages[key]=archerSheet;continue;}
    const img=document.createElement('img');img.onload=refresh;img.src=asset.url;spriteImages[key]=img;
  }
}
const spriteFor=u=>spriteImages[CrusaderAssets.spriteKey(u)];
const animationFor=u=>spriteImages[CrusaderAssets.theme.towers.units[u.kind==='tower'?u.type:u.color]?.animation];
const animationDefinitionFor=u=>CrusaderAssets.theme.towers.images[CrusaderAssets.theme.towers.units[u.kind==='tower'?u.type:u.color]?.animation];
let T=30, G=null, S=null, revision=0, runId=null, busy=false;
let requestSequence=0, appliedSequence=0, historyRun=null, historyBusy=false, savedRun=null;
let selectedUnitId=null,towerListSignature='';
let mergeVisuals=[];
const motion=new CrusaderMotion.Buffer(),weaponMotion=new Map();
const camera=new class extends CrusaderMotion.Camera{
  matrix(width,height,world){
    const availableHeight=Math.max(180,height-120);
    const s=Math.min(Math.max(180,width-24)/(world*2),availableHeight/(world*1.04))*this.zoom;
    return {a:s,b:s*.5,c:-s,d:s*.5,e:width/2+this.panX,f:60+(availableHeight-s*world)/2+this.panY};
  }
}();
let viewWidth=735,viewHeight=735,drag=null,suppressClick=false;
let lastServerTime=0,clockOffset=0,lastEffectId=0,shots=[],displayEnemies=[],renderTime=0,frameDt=1/60;
const weaponNames={R:'Topçu',B:'Buz okçusu',D:'Mancınıkçı',W:'Okçu',P:'Yaylım okçusu',G:'Mehterci'};
const weaponFor=u=>CrusaderAssets.theme.towers.units[u.kind==='tower'?u.type:u.color]?.weapon;
const units=()=>G.grid.flat().filter(t=>t.unit).map(t=>t.unit);
const attackers=()=>units(); // Used only to draw support links.
const statsOf=u=>u.stats;
const mergePairs=()=>S.pairs;
const byId=id=>units().concat(S.pending).find(u=>u.id===+id);
function toast(message){
  const el=$('toast');el.textContent=message;el.style.opacity=1;
  clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.style.opacity=0,2000);
}
async function refreshHistory(){
  if(historyBusy)return;
  historyBusy=true;
  try{
    const response=await fetch('/api/results');
    if(!response.ok)throw new Error('Oyun geçmişi alınamadı.');
    const results=await response.json();$('history').replaceChildren();
    if(results.some(r=>r.id===runId)){savedRun=runId;if(S?.over)$('backendStatus').textContent='Oyun sonucu sunucuda kaydedildi.';}
    for(const result of results){
      const row=document.createElement('p');
      row.textContent=`${result.outcome==='win'?'Zafer':'Yenilgi'} · Tur ${result.turn} · Can ${result.lives} · ${new Date(result.createdAt).toLocaleString('tr-TR')}`;
      $('history').append(row);
    }
    if(!results.length)$('history').textContent='Henüz tamamlanmış oyun yok.';
  }catch(error){$('history').textContent=error.message;}
  finally{historyBusy=false;}
}
function accept(snapshot, sequence){
  if(sequence<appliedSequence)return;
  appliedSequence=sequence;
  const hover=S?.hover, highlighted=S?.hl?.id;
  const previousPhase=S?.phase, previousRun=runId;
  const previousRevision=revision;
  const received=performance.now();
  const previousUnits=G?units().map(u=>({...u})):[];
  G=snapshot.map;S=snapshot.state;revision=snapshot.revision;runId=snapshot.runId;
  if(previousRun===runId)for(const u of units()){
    const old=previousUnits.find(p=>p.id===u.id);
    if(old&&u.lvl>old.lvl)mergeVisuals.push({x:u.x,y:u.y,lvl:u.lvl,at:received});
  }
  else mergeVisuals=[];
  lastServerTime=snapshot.serverTimeMs;
  if(previousRun!==runId){motion.clear();weaponMotion.clear();shots=[];lastEffectId=0;clockOffset=received-lastServerTime;renderTime=lastServerTime-120;}
  else clockOffset=Math.min(clockOffset,received-lastServerTime);
  if(S.phase==='wave')motion.push(lastServerTime,S);else motion.clear();
  N=snapshot.rules.n;RANGE=snapshot.rules.range;COL=snapshot.rules.colors;
  TOWERS=snapshot.rules.towers;WAVES=snapshot.rules.waves;KEYS=Object.keys(COL);
  // Reconnect JSON unit references only for selection highlights.
  const canonical=new Map(units().map(u=>[u.id,u]));
  S.pending=S.pending.map(u=>canonical.get(u.id)||u);
  S.pairs=S.pairs.map(pair=>pair.map(u=>canonical.get(u.id)||u));
  if(S.pick)S.pick.cands=S.pick.cands.map(u=>canonical.get(u.id)||u);
  for(const u of units())u.buffTarget=canonical.get(u.buffTargetId)||null;
  for(const f of S.fx){
    if(f.id<=lastEffectId)continue;
    lastEffectId=f.id;
    const duration=f.k==='beam'?.35:f.k==='ring'?.45:.4;
    const source=canonical.get(f.sourceId),born=lastServerTime-(duration-f.t)*1000;
    shots.push({...f,born,weapon:source?weaponFor(source):'archer'});
    if(source){
      const target=Math.atan2(f.y2-f.y1,f.x2-f.x1),previous=weaponMotion.get(source.id);
      weaponMotion.set(source.id,{angle:previous?.angle??target,target,fired:born});
    }
  }
  S.hover=previousRun===runId?hover:null;S.hl=byId(highlighted)||null;
  document.querySelectorAll('[data-sp]').forEach(b=>b.classList.toggle('on',+b.dataset.sp===S.speed));
  if(previousRevision!==revision||previousRun!==runId)renderPanel();
  if(selectedUnitId&&!canonical.has(selectedUnitId))selectedUnitId=null;
  renderTowerCards();renderInspect();$('hLives').textContent=S.lives;
  $('turnPhase').textContent=({place:'İnşa',choose:'Birlik seçimi',ready:'Hazır',wave:'Savaş',over:S.over==='win'?'Zafer':'Yenilgi'})[S.phase];
  $('hEn').textContent=S.enemies.length+S.spawnLeft;
  if(previousRun!==runId){camera.zoom=N>21?2:1;camera.panX=0;camera.panY=0;resize();renderLegend();}
  $('backendStatus').textContent=S.over?(savedRun===runId?'Oyun sonucu sunucuda kaydedildi.':'Oyun bitti. Sonuç sunucuda kaydediliyor.'):'C# oyun sunucusu bağlı.';
  if(S.over&&(previousPhase!=='over'||historyRun!==runId)){
    historyRun=runId;setTimeout(refreshHistory,400);
  }
}
async function request(url, options){
  const response=await fetch(url,options);
  const data=await response.json();
  if(!response.ok){const error=new Error(data.error||'Sunucu isteği başarısız.');error.status=response.status;throw error;}
  return data;
}
async function send(command){
  if(!S||busy)return;
  busy=true;
  const sequence=++requestSequence;
  try{
    accept(await request('/api/game/commands',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({...command,revision})}),sequence);
  }catch(error){toast(error.message);$('backendStatus').textContent='Hamle uygulanamadı. Sunucu durumu yenilenecek.';}
  finally{busy=false;}
}
async function poll(){
  if(!busy){
    const sequence=++requestSequence;
    try{accept(await request('/api/game'),sequence);}
    catch(error){
      $('backendStatus').textContent=error.status===410?'Oturum sona erdi. Oyunu yeniden bağla.':'Sunucu bağlantısı kesildi. Yeniden deneniyor…';
      if(error.status===410){$('reconnect').hidden=false;return;}
    }
  }
  setTimeout(poll,S?.phase==='wave'?75:250);
}
async function connect(){
  $('reconnect').hidden=true;
  try{
    const sequence=++requestSequence;
    accept(await request('/api/game',{method:'POST'}),sequence);
    void refreshHistory();void poll();
  }catch(error){$('backendStatus').textContent='Sunucuya bağlanılamadı. ASP.NET Core uygulamasını başlat.';$('reconnect').hidden=false;}
}
$('reconnect').onclick=connect;
$('refreshHistory').onclick=refreshHistory;

/* ---------- drawing ---------- */
// Presentation only: Seljuk stonework and tile motifs, Crusader unit silhouettes.
const boardEnv={
  get phase(){return S?.phase;},
  get map(){return G;},get mapKey(){return runId;},
  get ctx(){return ctx;},get T(){return T;},get N(){return N;},get COL(){return COL;},get TOWERS(){return TOWERS;},
  get THEME(){return CrusaderAssets.theme.palette;},get theme(){return CrusaderAssets.theme;},
  get terrainTexture(){return terrainTexture;},
  get environmentImages(){return environmentImages;},
  get enemyImages(){return enemyImages;},
  project:(x,y)=>{const m=camera.matrix(viewWidth,viewHeight,N*T);return {x:m.a*x+m.c*y+m.e,y:m.b*x+m.d*y+m.f,scale:m.a*1.65,width:viewWidth,height:viewHeight};},
  get weaponMotion(){return weaponMotion;},get frameDt(){return frameDt;},get renderTime(){return renderTime;},
  get displayEnemies(){return displayEnemies;},get archerSheet(){return archerSheet;},
  statsOf,spriteFor,animationFor,animationDefinitionFor,weaponFor,upright,drawPlinth:(...args)=>boardRenderers.terrain.drawPlinth(...args),mix,shapePath
};
const boardRenderers=CrusaderAssets.createRenderers(boardEnv);
CrusaderAssets.subscribe(()=>{loadThemeImages();iconCache.clear();towerListSignature='';if(S){renderLegend();renderTowerCards();}});
loadThemeImages();

const drawFloor=(...args)=>boardRenderers.terrain.drawFloor(...args);
const drawEnvironment=(...args)=>boardRenderers.terrain.drawEnvironment(...args);
const drawMapBoundary=(...args)=>boardRenderers.terrain.drawMapBoundary(...args);
function strokeTile(x,y,inset=1){CrusaderBoardGeometry.octagonPath(ctx,x,y,T,inset);ctx.stroke();}
const drawWall=(...args)=>boardRenderers.terrain.drawWall(...args);
const drawGate=(...args)=>boardRenderers.terrain.drawGate(...args);
const drawWeapon=(...args)=>boardRenderers.towers.drawWeapon(...args);
const drawSoldier=(...args)=>boardRenderers.towers.drawSoldier(...args);
const drawTower=(...args)=>boardRenderers.towers.drawTower(...args);
const drawCrusader=(...args)=>boardRenderers.enemies.drawCrusader(...args);
function shapePath(c,k,x,y,r){
  c.beginPath();
  if(k==='R'){c.moveTo(x,y-r);c.lineTo(x+r*.92,y+r*.7);c.lineTo(x-r*.92,y+r*.7);c.closePath();}
  else if(k==='B'){c.arc(x,y,r*.85,0,Math.PI*2);}
  else if(k==='D'){for(let i=0;i<6;i++){const a=Math.PI/3*i+Math.PI/6;c.lineTo(x+Math.cos(a)*r*.9,y+Math.sin(a)*r*.9);}c.closePath();}
  else if(k==='W'){c.moveTo(x,y-r);c.lineTo(x+r*.75,y);c.lineTo(x,y+r);c.lineTo(x-r*.75,y);c.closePath();}
  else if(k==='P'){for(let i=0;i<10;i++){const a=-Math.PI/2+Math.PI/5*i,rr=i%2?r*.45:r;c.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr);}c.closePath();}
  else if(k==='G'){const w=r*.36;c.moveTo(x-w,y-r);c.lineTo(x+w,y-r);c.lineTo(x+w,y-w);c.lineTo(x+r,y-w);c.lineTo(x+r,y+w);c.lineTo(x+w,y+w);c.lineTo(x+w,y+r);c.lineTo(x-w,y+r);c.lineTo(x-w,y+w);c.lineTo(x-r,y+w);c.lineTo(x-r,y-w);c.lineTo(x-w,y-w);c.closePath();}
}
function mix(hex,a,base='#0f1117'){
  const p=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));const A=p(hex),B=p(base);
  return'rgb('+A.map((v,i)=>Math.round(v*a+B[i]*(1-a))).join(',')+')';
}
const drawSoul=(...args)=>boardRenderers.towers.drawSoul(...args);
function upright(x,y,paint){
  const m=camera.matrix(viewWidth,viewHeight,N*T),det=m.a*m.d-m.b*m.c,s=m.a*1.65;
  ctx.save();ctx.translate(x,y);ctx.transform(m.d*s/det,-m.b*s/det,-m.c*s/det,m.a*s/det,0,0);paint();ctx.restore();
}
const drawIsoWall=(...args)=>boardRenderers.terrain.drawIsoWall(...args);
const drawUnitSprite=(...args)=>boardRenderers.towers.drawUnitSprite(...args);
function drawTowerRange(u){
  const range=statsOf(u).range;
  ctx.save();ctx.beginPath();ctx.arc((u.x+.5)*T,(u.y+.5)*T,range*T,0,Math.PI*2);
  ctx.fillStyle='#3cac8b16';ctx.fill();ctx.strokeStyle='#80cfad88';ctx.lineWidth=1.5;ctx.stroke();ctx.clip();
  ctx.fillStyle='#df424266';
  for(let y=Math.max(0,Math.floor(u.y-range-1));y<=Math.min(N-1,Math.ceil(u.y+range+1));y++)
    for(let x=Math.max(0,Math.floor(u.x-range-1));x<=Math.min(N-1,Math.ceil(u.x+range+1));x++)
      if(!CrusaderTerrainSight.canFire(G,u,x,y))ctx.fillRect(x*T,y*T,T,T);
  ctx.restore();
}
function draw(now){
  renderTime=Math.max(renderTime,performance.now()-clockOffset-120);
  displayEnemies=motion.view(renderTime);
  const W=N*T,dpr=window.devicePixelRatio||1;
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,viewWidth,viewHeight);
  ctx.fillStyle='#000';ctx.fillRect(0,0,viewWidth,viewHeight);
  ctx.save();const m=camera.matrix(viewWidth,viewHeight,W);ctx.transform(m.a,m.b,m.c,m.d,m.e,m.f);
  drawFloor();
  ctx.beginPath();ctx.rect(0,0,W,W);ctx.clip();
  drawEnvironment();
  drawMapBoundary();
  boardRenderers.terrain.drawPlayableGround();
  // path preview
  const nextW=WAVES[S.turn-1],waveInfo=S.phase==='wave'?S.wave:nextW,pp=waveInfo?.jump?S.jpath:S.path;
  if(pp?.length){
    ctx.save();ctx.lineCap='round';ctx.lineJoin='round';ctx.setLineDash([]);
    const routeColor=waveInfo?.jump?'#f0acff':'#80efd4',scale=Math.max(.01,m.a);
    ctx.beginPath();
    pp.forEach(([x,y],i)=>{const X=(x+.5)*T,Y=(y+.5)*T;i?ctx.lineTo(X,Y):ctx.moveTo(X,Y);});
    ctx.strokeStyle='#09241fee';ctx.lineWidth=8/scale;ctx.stroke();
    ctx.strokeStyle=routeColor;ctx.lineWidth=3.5/scale;ctx.stroke();
    // Arrows follow actual path segments and preserve the server's route order.
    for(let i=1;i<pp.length;i+=3){
      const [ax,ay]=pp[i-1],[bx,by]=pp[i],dx=bx-ax,dy=by-ay,length=Math.hypot(dx,dy);
      if(!length)continue;
      const ux=dx/length,uy=dy/length,x=(ax+bx+1)*T*.5,y=(ay+by+1)*T*.5,r=T*.24;
      ctx.beginPath();ctx.moveTo(x+ux*r,y+uy*r);ctx.lineTo(x-ux*r-uy*r*.7,y-uy*r+ux*r*.7);ctx.lineTo(x-ux*r+uy*r*.7,y-uy*r-ux*r*.7);ctx.closePath();
      ctx.fillStyle=routeColor;ctx.fill();ctx.strokeStyle='#09241f';ctx.lineWidth=1.3/scale;ctx.stroke();
    }
    ctx.restore();
  }
  // pick highlights
  // units
  const scenery=G.grid.flat().filter(t=>t.obs||t.rock||t.unit||t.cp>=0).map(t=>({depth:t.x+t.y+.5,t}));
  scenery.push(...displayEnemies.map(e=>({depth:e.x+e.y,e})));
  scenery.push(...(G.features||[]).filter(f=>f.kind!=='bridge').map(f=>({depth:f.x+f.y+(f.width+f.depth)/2,f})));
  scenery.sort((a,b)=>a.depth-b.depth);
  for(const item of scenery){
    if(item.f){boardRenderers.terrain.drawNaturalFeature(item.f);continue;}
    if(item.e){const e=item.e;upright((e.x+.5)*T,(e.y+.5)*T,()=>{ctx.translate(-(e.x+.5)*T,-(e.y+.5)*T-T*.23);drawCrusader(e,now);});continue;}
    const t=item.t;if(t.obs||t.rock)drawIsoWall(t);
    if(t.cp>=0&&t.terrain!=='gate')upright((t.x+.5)*T,(t.y+.5)*T,()=>drawGate(-.5,-.75,t.cp));
    const u=t.unit;if(!u)continue;
    const X=(u.x+.5)*T,Y=(u.y+.5)*T;
    if(u.kind==='tower'){
      drawUnitSprite(u,now);
      continue;
    }
    if(!u.revealed){
      CrusaderBoardGeometry.octagonPath(ctx,u.x*T,u.y*T,T,T*.08);ctx.fillStyle='#335469';ctx.fill();ctx.strokeStyle='#26323d';ctx.lineWidth=2;ctx.stroke();
      ctx.fillStyle='#eee0ba';ctx.font=`700 ${Math.round(T*.52)}px 'IBM Plex Sans',sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('?',X,Y+1);continue;
    }
    drawUnitSprite(u,now);
    if(S.pending.includes(u)&&u.status==='kept'){ctx.strokeStyle='#184a67';ctx.lineWidth=2;ctx.beginPath();ctx.arc(X,Y,T*.47,0,Math.PI*2);ctx.stroke();}
    if(S.phase==='choose'&&S.pending.includes(u)&&!u.status&&!S.pick){ctx.strokeStyle='rgba(24,64,73,.6)';ctx.setLineDash([3,3]);ctx.lineWidth=1;strokeTile(u.x*T,u.y*T,2.5);ctx.setLineDash([]);}
    if(u.flash>0){u.flash-=.02;ctx.strokeStyle=`rgba(255,255,255,${u.flash})`;ctx.lineWidth=2;ctx.beginPath();ctx.arc(X,Y,T*(.9-u.flash*.4),0,Math.PI*2);ctx.stroke();}
  }
  // green links
  if(S.phase==='wave')for(const u of attackers())if(u.buffTarget){ctx.strokeStyle='rgba(70,214,124,.45)';ctx.setLineDash([2,4]);ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo((u.x+.5)*T,(u.y+.5)*T);ctx.lineTo((u.buffTarget.x+.5)*T,(u.buffTarget.y+.5)*T);ctx.stroke();ctx.setLineDash([]);}
  // hover
  const h=S.hover;
  if(h){
    const t=G.grid[h[1]][h[0]];
    if(t.terrain==='mountain'||t.terrain==='gate'){
      const feature=(G.features||[]).find(f=>f.kind===t.terrain&&h[0]>=f.x&&h[0]<f.x+f.width&&h[1]>=f.y&&h[1]<f.y+f.depth);
      if(feature)boardRenderers.terrain.drawFeatureFootprint(feature,true);
    }
    ctx.strokeStyle='rgba(25,78,108,.85)';ctx.lineWidth=1.5;strokeTile(h[0]*T,h[1]*T);
    const u=t.unit;
    if(u&&u.revealed)drawTowerRange(u);
    else if(S.phase==='place'&&S.tool==='soul'&&!t.unit&&!t.obs&&!t.immutable&&(t.terrain||'ground')==='ground'&&t.cp<0){ctx.strokeStyle='rgba(25,78,108,.3)';ctx.beginPath();ctx.arc((h[0]+.5)*T,(h[1]+.5)*T,(RANGE+.5)*T,0,Math.PI*2);ctx.stroke();ctx.fillStyle='rgba(25,78,108,.4)';ctx.beginPath();ctx.arc((h[0]+.5)*T,(h[1]+.5)*T,T*.3,0,Math.PI*2);ctx.fill();}
  }
  const focused=byId(selectedUnitId)||S.hl;
  if(focused){ctx.strokeStyle='#184a67';ctx.lineWidth=2;strokeTile(focused.x*T,focused.y*T);if(focused.revealed&&(!h||G.grid[h[1]][h[0]].unit?.id!==focused.id))drawTowerRange(focused);}
  if(S.pick){
    const pulse=.5+.5*Math.sin(now*5);
    for(const u of S.pick.cands){
      const x=u.x*T,y=u.y*T;ctx.save();ctx.fillStyle=`rgba(255,207,70,${.14+.12*pulse})`;CrusaderBoardGeometry.octagonPath(ctx,x,y,T);ctx.fill();
      ctx.strokeStyle='#182532';ctx.lineWidth=6;strokeTile(x,y,2);
      ctx.strokeStyle='#ffdf62';ctx.lineWidth=3;strokeTile(x,y,2);
      ctx.fillStyle='#182532';ctx.fillRect(x,y-T*.27,T,T*.28);ctx.fillStyle='#ffdf62';ctx.font=`700 ${Math.max(9,T*.22)}px 'IBM Plex Sans'`;ctx.textAlign='center';ctx.fillText('SEÇ',x+T/2,y-T*.06);ctx.restore();
    }
  }
  mergeVisuals=mergeVisuals.filter(v=>performance.now()-v.at<1100);
  for(const v of mergeVisuals){
    const p=(performance.now()-v.at)/1100,x=(v.x+.5)*T,y=(v.y+.5)*T;
    ctx.save();ctx.globalAlpha=1-p;ctx.strokeStyle='#ffe473';ctx.lineWidth=4*(1-p)+1;ctx.beginPath();ctx.arc(x,y,T*(.35+p*.9),0,Math.PI*2);ctx.stroke();
    for(let i=0;i<8;i++){const a=i*Math.PI/4,r=T*(.3+p);ctx.fillStyle='#fff2af';ctx.fillRect(x+Math.cos(a)*r-2,y+Math.sin(a)*r-2,4,4);}
    ctx.fillStyle='#172632';ctx.fillRect(x-T*.65,y-T*(.9+p*.3),T*1.3,T*.35);ctx.fillStyle='#ffe473';ctx.font=`700 ${Math.max(10,T*.27)}px 'IBM Plex Sans'`;ctx.textAlign='center';ctx.fillText(`Lv ${v.lvl} ↑`,x,y-T*(.65+p*.3));ctx.restore();
  }
  // enemies
  // fx
  drawShots();
  ctx.restore();
  drawReadableLabels();
}
function drawReadableLabels(){
  ctx.save();ctx.beginPath();
  [[0,0],[N*T,0],[N*T,N*T],[0,N*T]].forEach(([x,y],i)=>{const p=boardEnv.project(x,y);i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y);});ctx.closePath();ctx.clip();
  const label=(text,x,y,color)=>{
    const p=boardEnv.project(x,y);if(p.x<-40||p.y<-30||p.x>viewWidth+40||p.y>viewHeight+30)return;
    ctx.save();ctx.font="700 13px 'IBM Plex Sans',sans-serif";ctx.textAlign='center';ctx.textBaseline='middle';
    const width=ctx.measureText(text).width+12;ctx.fillStyle='#11180fee';ctx.fillRect(p.x-width/2,p.y-10,width,20);
    ctx.strokeStyle=color;ctx.lineWidth=1;ctx.strokeRect(p.x-width/2,p.y-10,width,20);ctx.fillStyle='#fff4d4';ctx.fillText(text,p.x,p.y);ctx.restore();
  };
  for(const u of units())if(u.revealed){const lift=G.grid[u.y][u.x].rock?T*.32:0;label(`Lv ${u.lvl}`,(u.x+.5)*T-lift,(u.y+.5)*T-lift,COL[u.color].hex);}
  for(const f of G.features||[])if(f.kind==='gate')label(`Kapı ${f.variant}`,(f.x+f.width/2)*T,(f.y+f.depth/2)*T,'#e7c984');
  ctx.restore();
}
const drawPlinth=(...args)=>boardRenderers.terrain.drawPlinth(...args);
function drawShots(){
  shots=shots.filter(f=>renderTime-f.born<700);
  for(const f of shots){
    const age=(renderTime-f.born)/1000;if(age<0)continue;
    ctx.save();
    if(f.k==='beam'){
      const flight=f.weapon==='cannon'||f.weapon==='catapult'?.18:.13,p=Math.min(1,age/flight);
      const lift=f.weapon==='archer'||f.weapon==='volley'? .62*(1-p)+.24*p:0;
      const x=(f.x1+(f.x2-f.x1)*p+.5-lift)*T,y=(f.y1+(f.y2-f.y1)*p+.5-lift)*T-Math.sin(p*Math.PI)*T*(f.weapon==='catapult'?1:.15);
      if(p<1){
        ctx.translate(x,y);ctx.rotate(Math.atan2(f.y2-f.y1,f.x2-f.x1));ctx.strokeStyle=f.c;ctx.fillStyle=f.c;ctx.lineWidth=1.6;
        if(f.weapon==='cannon'||f.weapon==='catapult'){ctx.beginPath();ctx.arc(0,0,T*.08,0,Math.PI*2);ctx.fill();ctx.globalAlpha=.35;ctx.fillRect(-T*.3,-1,T*.22,2);}
        else{ctx.beginPath();ctx.moveTo(-T*.24,0);ctx.lineTo(T*.12,0);ctx.moveTo(T*.04,-T*.05);ctx.lineTo(T*.12,0);ctx.lineTo(T*.04,T*.05);ctx.stroke();}
      }else if(age<flight+.22){
        ctx.globalAlpha=1-(age-flight)/.22;
        const r=T*(.08+(age-flight)*.6);
        for(let i=0;i<6;i++){const a=i*Math.PI/3;ctx.fillStyle=f.c;ctx.beginPath();ctx.arc((f.x2+.5)*T+Math.cos(a)*r,(f.y2+.5)*T+Math.sin(a)*r,Math.max(.6,T*.035),0,Math.PI*2);ctx.fill();}
      }
    }else if(f.k==='ring'&&age<.4){ctx.strokeStyle=f.c;ctx.globalAlpha=(1-age/.4)*.7;ctx.lineWidth=2;ctx.beginPath();ctx.arc((f.x+.5)*T,(f.y+.5)*T,f.r*T*(.4+age*2),0,Math.PI*2);ctx.stroke();}
    else if(f.k==='leak'&&age<.4){ctx.fillStyle='#ff6b5b';ctx.globalAlpha=(1-age/.4)*.09;ctx.fillRect(0,0,N*T,N*T);}
    ctx.restore();
  }
}

/* ---------- panel ---------- */
function svgShape(k,s=18){
  const c=COL[k].hex,h=s/2,r=s*.45;let el='';
  const pts=a=>a.map(p=>p.map(v=>v.toFixed(1)).join(',')).join(' ');
  if(k==='R')el=`<polygon points="${pts([[h,h-r],[h+r*.92,h+r*.7],[h-r*.92,h+r*.7]])}" fill="${c}"/>`;
  else if(k==='B')el=`<circle cx="${h}" cy="${h}" r="${r*.85}" fill="${c}"/>`;
  else if(k==='D'){const a=[];for(let i=0;i<6;i++){const t=Math.PI/3*i+Math.PI/6;a.push([h+Math.cos(t)*r*.9,h+Math.sin(t)*r*.9]);}el=`<polygon points="${pts(a)}" fill="#24133f" stroke="${c}" stroke-width="1.6"/>`;}
  else if(k==='W')el=`<polygon points="${pts([[h,h-r],[h+r*.75,h],[h,h+r],[h-r*.75,h]])}" fill="${c}"/>`;
  else if(k==='P'){const a=[];for(let i=0;i<10;i++){const t=-Math.PI/2+Math.PI/5*i,rr=i%2?r*.45:r;a.push([h+Math.cos(t)*rr,h+Math.sin(t)*rr]);}el=`<polygon points="${pts(a)}" fill="${c}"/>`;}
  else if(k==='G'){const w=r*.36;el=`<path d="M${h-w} ${h-r}h${2*w}v${r-w}h${r-w}v${2*w}h${-(r-w)}v${r-w}h${-2*w}v${-(r-w)}h${-(r-w)}v${-2*w}h${r-w}z" fill="${c}"/>`;}
  return`<svg width="${s}" height="${s}" viewBox="0 0 ${s} ${s}" aria-hidden="true">${el}</svg>`;
}
const soulLabel=u=>`${unitIcon(u)}<small>${unitName(u)}</small><span class="lv">Lv. ${u.lvl}</span>`;
function recipeButtons(){
  return S.recipes.map(r=>`<button data-craft="${r.key}">${TOWERS[r.key].name} kur${r.over?' <span class="warn">· fazla seviye harcanır</span>':''}</button>`).join('');
}
function toolRow(){
  return`<div class="row"><button data-tool="soul" class="${S.tool==='soul'?'on':''}">${S.phase==='place'?'Ruh koy':'Seç'}</button><button data-tool="remove" class="${S.tool==='remove'?'on':''}">Duvar kaldır</button></div>`;
}
function renderPanel(){
  $('hTurn').textContent=S.turn;$('hLives').textContent=S.lives;
  let h='',mergeHtml='';
  if(S.pick){
    h=`<h2 class="phase-help" tabindex="0" title="Parlayan karolardan birine tıkla. Diğer malzemeler duvara döner.">Karo seç ⓘ</h2><p class="big">${S.pick.label}</p><div class="row"><button data-act="cancelPick">Vazgeç</button></div>`;
  }else if(S.phase==='place'){
    const r=recipeButtons();
    h=`<h2 class="phase-help" tabindex="0" title="Boş karoya ya da bir duvarın üstüne tıkla. Yolu kapatan karoya izin verilmez. Konmuş ruha tıklarsan geri alırsın. Hazır tarifleri haritadaki ruhlarla kurabilirsin.">İnşa ⓘ</h2><div class="build-controls">
    ${toolRow()}</div>
    ${r?`<div class="row">${r}</div>`:''}`;
  }else if(S.phase==='choose'&&S.step==='keep'){
    const m=mergePairs(),r=recipeButtons();
    h=`<div class="merge-heading"><h2 class="phase-help" tabindex="0" title="Tuttuğun ruh haritada kalır ve saldırır. Tıkla ya da karoyu seç. Eş birlikler birleşebilir; birleşen tutulmuş sayılır, eşi duvara döner. Hazır tarifle kurulan kule tutulmuş sayılır.">Ruhlar açıldı ⓘ</h2><span class="merge-status">Birini tut</span></div>
    <div class="spirit-slots">${S.pending.map(u=>`<span class="chip spirit-slot" role="button" tabindex="0" data-keep="${u.id}">${soulLabel(u)}</span>`).join('')}</div>
    ${m.length?`<div class="row">${m.map((p,i)=>`<button data-merge="${i}">${unitName(p[0])} Lv ${p[0].lvl} + Lv ${p[0].lvl} → Lv ${p[0].lvl+1}</button>`).join('')}</div>`:''}
    ${r?`<div class="row">${r}</div>`:''}`;
  }else if(S.phase==='choose'&&S.step==='rock'){
    const need=2-S.pending.filter(p=>p.status==='rock').length;
    h=`<div class="merge-heading"><h2 class="phase-help" tabindex="0" title="Seçmediğin ruhlar dağılır. Duvarın üstündeki ruh duvar olursa duvar yükselir ve zıplanamaz olur.">Labirent ⓘ</h2><span class="merge-status">${need} ruhu duvara çevir</span></div>
    <div class="spirit-slots">${S.pending.map(u=>`<span class="chip spirit-slot ${u.status?'dim':''}" role="button" tabindex="0" ${u.status?'':`data-rock="${u.id}"`}>${soulLabel(u)}${u.status==='kept'?' <span class="tag">tutuldu</span>':u.status==='rock'?' <span class="tag">duvar</span>':''}</span>`).join('')}</div>`;
  }else if(S.phase==='ready'){
    const r=recipeButtons();
    h=`<h2 class="phase-help" tabindex="0" title="Duvarları istersen kaldırabilirsin. Hazır olunca başlat (Boşluk).">Hazır ⓘ</h2><p class="big">Savunma hazır</p>
    <div class="row"><button class="primary" data-act="start">Dalgayı başlat</button></div>${toolRow()}
    ${r?`<div class="row">${r}</div>`:''}`;
  }else if(S.phase==='wave'){
    h=`<h2 class="phase-help" tabindex="0" title="Düşmanlar 0 → 4 sırasıyla yürüyor.">Savaş ⓘ</h2><p class="big">Hisarı savun</p>`;
  }else if(S.phase==='over'){
    h=S.over==='win'?`<h2>Kat bitti</h2><p class="big">15 dalga geçildi</p><p>Kalan can: <b>${S.lives}</b></p>`:`<h2>Kaybettin</h2><p class="big">Dalga ${S.turn}'de düştün</p>`;
    h+=`<div class="row"><button class="primary" data-act="again">Aynı haritada tekrar</button><button data-act="new">Yeni harita</button></div>`;
  }
  if(!S.pick&&(S.phase==='place'||(S.phase==='choose'&&S.step==='rock'))){
    const m=mergePairs();
    mergeHtml+=`<div class="merge-heading"><h2 class="phase-help" tabindex="0" title="Aynı renk ve seviyedeki iki ruh veya aynı tür ve seviyedeki iki burç bir seviye yükselir. Kalacak karoyu seç; diğeri duvara dönüşür.">Birlik birleştir ⓘ</h2>${m.length?'' : '<span class="merge-status">Şu anda birleşebilecek eş yok.</span>'}</div>${m.length?`<div class="row">${m.map((p,i)=>`<button data-merge="${i}">${unitName(p[0])} Lv ${p[0].lvl} + Lv ${p[0].lvl} → Lv ${p[0].lvl+1}</button>`).join('')}</div>`:''}`;
  }
  $('spiritPlacement').hidden=S.phase!=='place';
  $('spiritPlacement').innerHTML=S.phase==='place'?`<p class="big">${S.pending.length}/5 ruh kondu</p><div class="spirit-slots">${Array.from({length:5},(_,i)=>`<div class="chip spirit-slot"><span class="mystery">?</span><small>${i<S.pending.length?'Yerleştirildi':'Ruh bekleniyor'}</small></div>`).join('')}</div>`:'';
  $('phase').innerHTML=h;
  if(S.phase==='choose'&&!S.pick){
    $('spiritPlacement').innerHTML=h;
    $('spiritPlacement').hidden=false;
    $('phase').replaceChildren();
  }
  $('phase').hidden=!$('phase').hasChildNodes();
  $('mergePanel').innerHTML=mergeHtml;
  $('mergePanel').hidden=!mergeHtml;
  const w=WAVES[Math.min(S.turn,15)-1];
  const traits=[w.armor?`Zırh ${w.armor}`:'',w.mr?`Büyü direnci %${Math.round(w.mr*100)}`:'',w.jump?'Zıplar: tek kat duvarları aşar':'',w.speed>=3?'Hızlı':w.speed<1.8?'Yavaş':''].filter(Boolean);
  $('waveTitle').textContent=`⚔ ${S.phase==='wave'?'Bu dalga':'Sıradaki dalga'} · ${S.turn}`;
  $('wave').innerHTML=`<p>${w.name}</p>
  <div class="wave-metrics"><span title="Düşman sayısı">⚔ ${w.n}</span><span title="Düşman canı">♥ ${w.hp}</span><span title="Hız">➜ ${w.speed} karo/sn</span></div>
  <div class="row">${traits.map(t=>`<span class="tag">${t}</span>`).join('')||'<span class="tag">Savunmasız</span>'}</div>
  ${w.armor>=8?'<p>Fiziksel hasar az işler; büyü ya da zırh kırma öne çıkar.</p>':w.mr>=.4?'<p>Büyü hasarı az işler; fiziksel öne çıkar.</p>':w.jump?'<p>Yolu yükseltilmiş duvarlarla kapatmazsan kestirme yapar.</p>':''}`;
}
const formatPower=value=>Number(value||0).toLocaleString('tr-TR',{maximumFractionDigits:1});
const unitName=u=>u.kind==='tower'?TOWERS[u.type].name:weaponNames[u.color];
function unitIcon(u){
  const sprite=spriteFor(u),sheet=animationFor(u),definition=animationDefinitionFor(u);
  if(sheet?.complete&&sheet.naturalWidth&&definition?.embedded){
    const key=`animation-icon:${CrusaderAssets.theme.id}:${u.kind}:${u.type||u.color}`;
    if(!iconCache.has(key)){
      const canvas=document.createElement('canvas');canvas.width=96;canvas.height=96;
      canvas.getContext('2d').drawImage(sheet,0,0,sheet.naturalWidth/definition.columns,sheet.naturalHeight/definition.rows,0,0,96,96);
      iconCache.set(key,canvas.toDataURL());
    }
    return `<img class="unit-icon" src="${iconCache.get(key)}" alt="${unitName(u)}">`;
  }
  const spriteDefinition=CrusaderAssets.theme.towers.images[CrusaderAssets.spriteKey(u)];
  if(sprite?.complete&&sprite.naturalWidth&&!spriteDefinition?.columns)return `<img class="unit-icon" src="${sprite.src}" alt="${unitName(u)}">`;
  const key=`${u.kind}:${u.type}:${u.color}:${u.lvl}`;
  if(!iconCache.has(key)){
    const canvas=document.createElement('canvas');canvas.width=96;canvas.height=96;
    const oldCtx=ctx,oldT=T,oldDt=frameDt;ctx=canvas.getContext('2d');T=80;frameDt=0;
    try{if(u.kind==='tower')drawTower({...u,id:-100},48,48);else drawSoul({...u,id:-101},48,48,29,0);iconCache.set(key,canvas.toDataURL());}
    finally{ctx=oldCtx;T=oldT;frameDt=oldDt;}
  }
  return `<img class="unit-icon" src="${iconCache.get(key)}" alt="${unitName(u)}">`;
}
function renderTowerCards(){
  const towers=units().filter(u=>u.revealed),signature=JSON.stringify(towers.map(u=>[u.id,u.lvl,u.powerPerSecond,u.buff,selectedUnitId===u.id]));
  if(signature===towerListSignature)return;towerListSignature=signature;
  $('towerPanel').append(inspectEl);
  $('towerCards').innerHTML=towers.length?towers.map(u=>`<button class="tower-summary ${selectedUnitId===u.id?'selected':''}" data-inspect="${u.id}" aria-expanded="${selectedUnitId===u.id}" style="--unit-color:${COL[u.color].hex}">${unitIcon(u)}<b>${unitName(u)}</b><span>Lv. ${u.lvl}</span><small>(${u.x}, ${u.y})</small><strong>${formatPower(u.powerPerSecond)} hasar/sn</strong></button>`).join(''):'<p>Birlikler açıldığında burada görünür.</p>';
  document.querySelector(`#towerCards [data-inspect="${selectedUnitId}"]`)?.after(inspectEl);
}
function renderInspect(){
  const pinned=byId(selectedUnitId),h=pinned?[pinned.x,pinned.y]:S.hover;
  inspectEl.hidden=!pinned;
  let html='<h2>İncele</h2>';
  if(!h){$('insp').innerHTML=html+'<p>Bir kulenin üstüne gel veya kartına tıklayarak bilgilerini sabitle.</p>';return;}
  const t=G.grid[h[1]][h[0]],u=t.unit;
  if(u?.revealed){
    const s=statsOf(u),interval=u.attackInterval??s.cd/(1+(u.buff||0)),power=u.powerPerSecond??s.dmg/interval;
    const details=[s.splash?`Alan etkisi: ${formatPower(s.splash)} karo`:'',s.slow?`Yavaşlatma: %${Math.round(s.slow*100)}`:'',s.shred?`Zırh kırma: ${formatPower(s.shred)} / vuruş`:'',s.multi?`Aynı anda ${s.multi} hedef`:'',s.support?`Destek: +%${Math.round(s.support*100)} saldırı hızı`:''].filter(Boolean);
    html+=`<div class="row"><span style="color:${COL[u.color].hex}">${svgShape(u.color,22)}</span><p class="big">${unitName(u)}</p><span class="tag">Lv. ${u.lvl}</span></div><p>${u.kind==='tower'?TOWERS[u.type].role:COL[u.color].verb}</p>
    <div class="power-grid"><div><strong>${formatPower(power)}</strong><small>Güncel ham hasar / sn</small></div><div><strong>${formatPower(s.dmg)}</strong><small>Vuruş hasarı · ${s.dt==='p'?'fiziksel':'büyü'}</small></div></div>
    <dl class="stat"><dt>Seviye</dt><dd>${u.lvl}</dd><dt>Atış aralığı</dt><dd>${formatPower(interval)} sn</dd><dt>Toplam yükseklik</dt><dd>${CrusaderTerrainSight.towerHeight(G,u)} (kule 1 + taban ${t.rock?1:0})</dd><dt>Menzil</dt><dd>${formatPower(s.range)} karo</dd><dt>Aktif hız desteği</dt><dd>+%${Math.round((u.buff||0)*100)}</dd><dt>Bu dalga hasarı</dt><dd>${formatPower(u.dmgThis)}</dd><dt>Son dalga hasarı</dt><dd>${formatPower(u.dmgLast)}</dd><dt>Konum</dt><dd>${u.x}, ${u.y}</dd></dl>
    ${details.length?`<div class="row">${details.map(text=>`<span class="tag">${text}</span>`).join('')}</div>`:''}
    <p style="font-size:11px">Kırmızı menzil alanlarında yüksek engeller atışı keser.</p><p style="font-size:11px">Ham güç hız desteğini içerir; düşman direnci, alan ve çoklu hedef etkileri bu sayıya dahil değildir.</p>
    ${S.pending.includes(u)?'<p class="warn">Birlik seçimi henüz tamamlanmadı.</p>':''}
    ${pinned?'<button data-unpin="1">Seçimi bırak</button>':`<button data-inspect="${u.id}">Kartı sabitle</button>`}`;
  }else if(u)html+='<p class="big">Açılmamış birlik</p><p>5 ruh konunca renk, seviye ve güç açılır.</p>';
  else if(t.rock)html+=`<p class="big">${t.rock.up?'Sağlamlaştırılmış duvar':'Duvar'}</p><p>${COL[t.rock.color].name} · Yükseklik: 1 · ${t.rock.up?'Keşifçiler aşamaz.':'Keşifçiler üzerinden atlar.'}</p><p>İnşa aşamasında ücretsiz kaldırılabilir.</p>`;
  else if(t.terrain==='mountain')html+='<p class="big">Dağ</p><p>8 kare kaplar. Sabittir; üstüne kule konamaz.</p>';
  else if(t.terrain==='tree')html+='<p class="big">Ağaç</p><p>Yükseklik: 3. Kaldırılamaz; üstüne kule konamaz.</p>';
  else if(t.terrain==='water')html+=`<p class="big">${t.bridge?'Köprü':'Su'}</p><p>${t.bridge?'Düşmanlar buradan geçebilir.':'Düşmanlar yalnızca köprüden geçebilir.'} Kule konamaz.</p>`;
  else if(t.obs)html+='<p class="big">Çatılı sabit duvar</p><p>Toplam yükseklik: 2. Kaldırılamaz; keşifçiler üzerinden geçemez.</p>';
  else if(t.cp>=0)html+=`<p class="big">Kapı ${t.cp}</p><p>${t.cp===0?'Haçlı birliklerinin giriş noktası.':t.cp===4?'İç hisar; buraya ulaşan düşman can götürür.':'Birlikler sırayla bu geçitten geçer.'}</p>`;
  else html+=`<p class="big">Boş karo</p><p>Konum: ${h[0]}, ${h[1]}</p>`;
  $('insp').innerHTML=html;
}
function renderLegend(){
$('legend').innerHTML=KEYS.map(k=>`${svgShape(k)}<span>${weaponNames[k]} · ${COL[k].name}<br><small>${COL[k].verb}</small></span><span class="t">${COL[k].dt==='p'?'fiziksel':'büyü'}</span>`).join('')+
  `<span></span><span style="grid-column:2/4;color:var(--muted);font-size:12px">Tarifler: <b style="color:var(--fg)">RBG</b> = Kırmızı+Mavi+Yeşil · <b style="color:var(--fg)">WPD</b> = Beyaz+Mor-pembe+Siyah-mor</span>`;


}


/* ---------- input: commands only; all rules run in C# ---------- */
document.addEventListener('click',ev=>{
  if(!S)return;
  const b=ev.target.closest('[data-act],[data-tool],[data-keep],[data-rock],[data-merge],[data-craft],[data-sp],[data-inspect],[data-unpin]');
  if(!b)return;const d=b.dataset;
  if(d.inspect){selectedUnitId=selectedUnitId===+d.inspect?null:+d.inspect;S.hover=null;towerListSignature='';renderTowerCards();renderInspect();}
  else if(d.unpin){selectedUnitId=null;S.hover=null;towerListSignature='';renderTowerCards();renderInspect();}
  else if(d.sp)void send({action:'speed',speed:+d.sp});
  else if(d.act)void send({action:d.act});
  else if(d.tool)void send({action:'tool',tool:d.tool});
  else if(d.keep)void send({action:'keep',id:+d.keep});
  else if(d.rock)void send({action:'rock',id:+d.rock});
  else if(d.merge)void send({action:'merge',index:+d.merge});
  else if(d.craft)void send({action:'craft',recipe:d.craft});
});
document.addEventListener('mouseover',ev=>{
  if(!S)return;const c=ev.target.closest('[data-keep],[data-rock]');
  S.hl=c?byId(c.dataset.keep||c.dataset.rock):null;
});
$('newMap').onclick=()=>void send({action:'new'});
function tileAt(ev){
  const p=pointerAt(ev),world=camera.world(p.x,p.y,viewWidth,viewHeight,N*T),x=Math.floor(world.x/T),y=Math.floor(world.y/T);
  return x>=0&&y>=0&&x<N&&y<N?[x,y]:null;
}
function pointerAt(ev){const r=cv.getBoundingClientRect();return {x:(ev.clientX-r.left)*viewWidth/r.width,y:(ev.clientY-r.top)*viewHeight/r.height};}
cv.addEventListener('wheel',ev=>{
  ev.preventDefault();const p=pointerAt(ev),delta=ev.deltaY*(ev.deltaMode===1?16:ev.deltaMode===2?viewHeight:1);
  camera.zoomAt(Math.exp(-Math.max(-300,Math.min(300,delta))*.0015),p.x,p.y,viewWidth,viewHeight,N*T);
},{passive:false});
cv.addEventListener('pointerdown',ev=>{if(!ev.shiftKey&&ev.button!==1)return;ev.preventDefault();drag={...pointerAt(ev),id:ev.pointerId};suppressClick=true;cv.setPointerCapture(ev.pointerId);cv.style.cursor='grabbing';});
cv.addEventListener('pointermove',ev=>{if(!drag)return;const p=pointerAt(ev);camera.panX+=p.x-drag.x;camera.panY+=p.y-drag.y;drag={...p,id:drag.id};});
function endDrag(){if(!drag)return;drag=null;cv.style.cursor='';}
cv.addEventListener('pointerup',endDrag);cv.addEventListener('pointercancel',endDrag);
const resetView=$('resetView');if(resetView)resetView.onclick=()=>camera.reset();
cv.addEventListener('mousemove',ev=>{if(!S)return;const t=tileAt(ev);if(String(t)!==String(S.hover)){S.hover=t;renderInspect();}});
cv.addEventListener('mouseleave',()=>{if(S){S.hover=null;renderInspect();}});
cv.addEventListener('click',ev=>{
  if(suppressClick||ev.shiftKey){suppressClick=false;return;}
  if(!S)return;const p=tileAt(ev);if(!p)return;
  const clicked=G.grid[p[1]][p[0]].unit;
  if(!S.pick&&clicked?.revealed){
    selectedUnitId=selectedUnitId===clicked.id?null:clicked.id;S.hover=null;towerListSignature='';renderTowerCards();renderInspect();
    document.querySelector(`[data-inspect="${clicked.id}"]`)?.scrollIntoView?.({block:'nearest',behavior:'smooth'});
    if(!S.pending.includes(clicked)||clicked.status)return;
  }
  if(S.pick){const unit=G.grid[p[1]][p[0]].unit;if(unit)void send({action:'pick',id:unit.id});}
  else void send({action:'tile',x:p[0],y:p[1]});
});
document.addEventListener('keydown',ev=>{
  if(!S)return;
  if((ev.key==='Enter'||ev.key===' ')&&ev.target.matches('.chip[role=button]')){ev.preventDefault();ev.target.click();return;}
  if(ev.code==='Space'&&S.phase==='ready'&&!ev.target.closest('button')){ev.preventDefault();void send({action:'start'});}
  if(ev.key==='Escape'&&S.pick)void send({action:'cancelPick'});
  else if(ev.key==='Escape'){selectedUnitId=null;S.hover=null;towerListSignature='';renderTowerCards();renderInspect();}
});
function resize(){
  const board=$('board');T=30;
  viewWidth=Math.max(1,board.clientWidth);viewHeight=Math.max(1,board.clientHeight);
  const dpr=window.devicePixelRatio||1;cv.width=viewWidth*dpr;cv.height=viewHeight*dpr;
  cv.style.width=viewWidth+'px';cv.style.height=viewHeight+'px';ctx.setTransform(dpr,0,0,dpr,0,0);
}
window.addEventListener('resize',resize);
let previousDraw=0;
function loop(now){frameDt=Math.min(.05,Math.max(0,(now-previousDraw)/1000));previousDraw=now;if(S)draw(now/1000);requestAnimationFrame(loop);}
resize();requestAnimationFrame(loop);
if(location.protocol==='file:'){
  $('backendStatus').textContent='Oyunu http://localhost:5080 adresinden aç.';
  $('phase').textContent='C# sunucusuna bağlantı gerekiyor.';
}else void connect();
})();
