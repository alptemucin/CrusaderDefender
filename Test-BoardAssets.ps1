param([switch]$CapturePreview,[string]$BaseUrl='http://localhost:5080')
$ErrorActionPreference='Stop'
$root=$PSScriptRoot
$testDirectory=Join-Path $root '.board-check'
[IO.Directory]::CreateDirectory($testDirectory) | Out-Null
$sources=@('wwwroot/board/registry.js','wwwroot/board/themes/seljuk.js','wwwroot/board/themes/winter.js','wwwroot/board/terrain/geometry.js','wwwroot/board/terrain/sight.js','wwwroot/board/terrain/renderer.js','wwwroot/board/towers/animation.js','wwwroot/board/towers/renderer.js','wwwroot/board/enemies/renderer.js','wwwroot/motion.js')
$code=($sources | ForEach-Object {[IO.File]::ReadAllText((Join-Path $root $_))}) -join "`n"
$game=[IO.File]::ReadAllText((Join-Path $root 'wwwroot/game.js')) | ConvertTo-Json -Compress
$archer=[Convert]::ToBase64String([IO.File]::ReadAllBytes((Join-Path $root 'wwwroot/assets/towers/seljuk/archer/idle.png')))
$animation=[Convert]::ToBase64String([IO.File]::ReadAllBytes((Join-Path $root 'wwwroot/assets/towers/seljuk/archer/animation.png')))
$cannon=[Convert]::ToBase64String([IO.File]::ReadAllBytes((Join-Path $root 'wwwroot/assets/towers/seljuk/cannon-team/animation-v1.png')))
$newSheets=@{}
foreach($pair in @(@('cannonAnimation','cannon'),@('iceArcherAnimation','ice-archer'),@('catapultAnimation','catapult'),@('volleyArcherAnimation','volley-archer'),@('drummerAnimation','drummer'),@('archerTeamAnimation','archer-team'))){
  $newSheets[$pair[0]]='data:image/png;base64,'+[Convert]::ToBase64String([IO.File]::ReadAllBytes((Join-Path $root ('wwwroot/assets/towers/seljuk/'+$pair[1]+'/animation-v1.png'))))
}
$newSheetData=$newSheets | ConvertTo-Json -Compress
$grass=[Convert]::ToBase64String([IO.File]::ReadAllBytes((Join-Path $root 'wwwroot/assets/terrain/seljuk/grass-tile-v1.png')))
$trees=[Convert]::ToBase64String([IO.File]::ReadAllBytes((Join-Path $root 'wwwroot/assets/terrain/seljuk/trees-atlas-v1.png')))
$mountains=[Convert]::ToBase64String([IO.File]::ReadAllBytes((Join-Path $root 'wwwroot/assets/terrain/seljuk/mountains-atlas-v1.png')))
$castleGate=[Convert]::ToBase64String([IO.File]::ReadAllBytes((Join-Path $root 'wwwroot/assets/terrain/seljuk/castle-gate-v2.png')))
$water=[Convert]::ToBase64String([IO.File]::ReadAllBytes((Join-Path $root 'wwwroot/assets/terrain/seljuk/water-tile-v1.png')))
$bridge=[Convert]::ToBase64String([IO.File]::ReadAllBytes((Join-Path $root 'wwwroot/assets/terrain/seljuk/bridge-v1.png')))
$enemySheets=@{}
foreach($pair in @(@('infantry','infantry'),@('knight','knight'),@('standardBearer','standard-bearer'),@('scout','scout'),@('siegeWagon','siege-wagon'))){
  $enemySheets[$pair[0]]='data:image/png;base64,'+[Convert]::ToBase64String([IO.File]::ReadAllBytes((Join-Path $root ('wwwroot/assets/enemies/seljuk/'+$pair[1]+'/walk-v1.png'))))
}
$enemySheetData=$enemySheets | ConvertTo-Json -Compress
$test=@'
(async()=>{
  const out=document.getElementById('result');
  try{
    const gameSource=GAME_SOURCE;
    new Function(gameSource);
    const assert=(value,message)=>{if(!value)throw new Error(message);};
    const cameraMatch=gameSource.match(/const camera=(new class[\s\S]*?}\(\));/);
    if(cameraMatch){
      const camera=new Function('CrusaderMotion','return '+cameraMatch[1])(CrusaderMotion);
      camera.zoomAt(100,300,300,1600,900,1890);assert(camera.zoom===8,'Camera supports 800 percent zoom');camera.reset();
      for(const [width,height] of [[1600,900],[640,900],[390,700]]){
        const matrix=camera.matrix(width,height,630),x=215,y=380;
        const sx=matrix.a*x+matrix.c*y+matrix.e,sy=matrix.b*x+matrix.d*y+matrix.f;
        const point=camera.world(sx,sy,width,height,630);
        assert(Math.abs(point.x-x)<.0001&&Math.abs(point.y-y)<.0001,'Fullscreen camera hit testing');
        camera.zoomAt(1.3,sx,sy,width,height,630);
        const zoomPoint=camera.world(sx,sy,width,height,630);
        assert(Math.abs(zoomPoint.x-x)<.0001&&Math.abs(zoomPoint.y-y)<.0001,'Fullscreen cursor zoom');
        camera.reset();
      }
    }
    const canvas=document.createElement('canvas');canvas.width=700;canvas.height=700;
    let activeContext=canvas.getContext('2d');
    const colors=Object.fromEntries(['R','B','D','W','P','G'].map(color=>[color,{hex:'#7599bb'}]));
    const load=source=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=reject;image.src=source;});
    const image=await load('data:image/png;base64,ARCHER_DATA');
    const sheet=await load('data:image/png;base64,ANIMATION_DATA');
    const cannonSheet=await load('data:image/png;base64,CANNON_DATA');
    const loadedSheets=Object.fromEntries(await Promise.all(Object.entries(NEW_SHEET_DATA).map(async([key,source])=>[key,await load(source)])));
    loadedSheets.cannonTeamAnimation=cannonSheet;loadedSheets.archerAnimation=sheet;
    const grassTexture=await load('data:image/png;base64,GRASS_DATA');
    const trees=await load('data:image/png;base64,TREE_DATA');
    const mountains=await load('data:image/png;base64,MOUNTAIN_DATA');
    const castleGate=await load('data:image/png;base64,CASTLE_GATE_DATA');
    const water=await load('data:image/png;base64,WATER_DATA'),bridge=await load('data:image/png;base64,BRIDGE_DATA');
    const enemyImages={};
    for(const [key,source] of Object.entries(ENEMY_SHEET_DATA))enemyImages[key]=await load(source);
    const environmentNodes=CrusaderBoardGeometry.environmentNodes(21);
    assert(environmentNodes.some(n=>n.kind==='trees')&&environmentNodes.some(n=>n.kind==='mountains'),'Environment bands');
    for(const node of environmentNodes){
      const distance=CrusaderBoardGeometry.borderDistance(node.x-.5,node.y-.5,21);
      assert(node.kind==='trees'?distance>=2&&distance<=5:distance>=7&&distance<=10,'Environment must stay outside the map in ordered bands');
      assert(node.size===1,'Environment assets use a single tile size');
    }
    assert(CrusaderBoardGeometry.octagonPoints(0,0,30).length===8,'Octagonal tile geometry');
    assert(CrusaderBoardGeometry.octagonPoints(30,60,30).every(([x,y])=>x>=30&&x<=60&&y>=60&&y<=90),'Octagons stay aligned with logical tiles');
    const mapPolygon=[[0,0],[100,0],[100,100],[0,100]];
    const item=(kind,left,top,right,bottom,id)=>({node:{kind,depth:id,id},bounds:{left,top,right,bottom}});
    const candidates=[item('trees',95,20,120,60,1),item('trees',120,20,140,60,2),item('mountains',130,10,175,80,3),item('mountains',180,10,220,80,4),item('mountains',210,10,250,80,5)];
    const filtered=CrusaderBoardGeometry.filterEnvironment(candidates,mapPolygon);
    assert(filtered.map(i=>i.node.id).join(',')==='2,4','Remove map-contacting trees and colliding mountains');
    assert(CrusaderBoardGeometry.rectTouchesPolygon({left:100,top:20,right:120,bottom:40},mapPolygon),'Boundary contact counts as overlap');
    assert(!CrusaderBoardGeometry.rectTouchesPolygon({left:0,top:0,right:10,bottom:10},[[50,0],[100,50],[50,100],[0,50]]),'Diamond collision uses polygon instead of its bounding box');
    assert(cannonSheet.naturalWidth===cannonSheet.naturalHeight&&cannonSheet.naturalWidth>=1024,'Cannon sheet dimensions');
    const alphaCanvas=document.createElement('canvas');alphaCanvas.width=cannonSheet.naturalWidth;alphaCanvas.height=cannonSheet.naturalHeight;
    const alphaCtx=alphaCanvas.getContext('2d');alphaCtx.drawImage(cannonSheet,0,0);
    assert(alphaCtx.getImageData(0,0,1,1).data[3]===0,'Cannon transparency');
    for(const [key,asset] of Object.entries(loadedSheets)){
      assert(asset.naturalWidth===asset.naturalHeight&&asset.naturalWidth>=1024,'Animation dimensions: '+key);
      alphaCanvas.width=asset.naturalWidth;alphaCanvas.height=asset.naturalHeight;alphaCtx.drawImage(asset,0,0);
      assert(alphaCtx.getImageData(0,0,1,1).data[3]===0,'Animation transparency: '+key);
      const cell=asset.naturalWidth/4;
      for(let row=0;row<4;row++)for(let column=0;column<4;column++){
        const pixels=alphaCtx.getImageData(column*cell,row*cell,cell,cell).data;
        assert(pixels.some((value,index)=>index%4===3&&value>0),'Empty animation frame: '+key);
      }
    }
    const missing={complete:false};
    const env={
      get ctx(){return activeContext;},T:30,N:21,COL:colors,
      TOWERS:{RBG:{need:['R','B','G']},WPD:{need:['W','P','D']}},
      get THEME(){return CrusaderAssets.theme.palette;},get theme(){return CrusaderAssets.theme;},
      terrainTexture:grassTexture,
      environmentImages:{trees,mountains,castleGate,water,bridge},
      enemyImages,
      project:(x,y)=>({x,y,scale:1,width:700,height:700}),
      phase:'wave',weaponMotion:new Map(),frameDt:1/60,renderTime:1000,displayEnemies:[],archerSheet:sheet,
      statsOf:()=>({range:4}),spriteFor:u=>u.color==='W'?image:loadedSheets[CrusaderAssets.spriteKey(u)]||missing,
      animationFor:u=>loadedSheets[CrusaderAssets.theme.towers.units[u.kind==='tower'?u.type:u.color]?.animation],
      animationDefinitionFor:u=>CrusaderAssets.theme.towers.images[CrusaderAssets.theme.towers.units[u.kind==='tower'?u.type:u.color]?.animation],
      weaponFor:u=>CrusaderAssets.theme.towers.units[u.kind==='tower'?u.type:u.color].weapon,
      upright:(x,y,paint)=>paint(),drawPlinth:(...args)=>renderers.terrain.drawPlinth(...args),
      mix:hex=>hex,shapePath:(ctx,k,x,y,r)=>{ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);}
    };
    const renderers=CrusaderAssets.createRenderers(env);
    const map={grid:Array.from({length:21},(_,y)=>Array.from({length:21},(_,x)=>({x,y,terrain:'ground',rock:null,obs:false}))),features:[]};
    const elevated={x:5,y:5};map.grid[5][6].rock={};
    assert(!CrusaderTerrainSight.canFire(map,elevated,8,5),'Client equal height blocks ground tower');
    map.grid[5][5].rock={};
    assert(CrusaderTerrainSight.canFire(map,elevated,8,5),'Client elevated tower clears low wall');
    map.grid[5][6].rock=null;map.grid[5][6].obs=true;
    assert(!CrusaderTerrainSight.canFire(map,elevated,8,5),'Client height 2 equality blocks elevated tower');
    assert(!CrusaderTerrainSight.canFire(map,elevated,7,7),'Client diagonal supercover');
    map.grid[5][6].obs=false;map.grid[5][6].terrain='tree';
    assert(!CrusaderTerrainSight.canFire(map,elevated,8,5),'Client height 3 tree blocks');
    const rangeBody=gameSource.match(/function drawTowerRange\(u\)\{([\s\S]*?)\n\}\nfunction draw/)[1];
    const paintRange=new Function('ctx','T','N','G','statsOf','CrusaderTerrainSight','u',rangeBody);
    const fillRect=activeContext.fillRect.bind(activeContext);let redTiles=0;
    activeContext.fillRect=(...args)=>{redTiles++;fillRect(...args);};
    paintRange(activeContext,30,21,map,()=>({range:4}),CrusaderTerrainSight,elevated);
    activeContext.fillRect=fillRect;assert(redTiles>0,'Blocked range cells painted red');
    map.grid[5][6].terrain='ground';map.grid[5][5].rock=null;
    map.grid[8][9].terrain='water';map.grid[8][9].bridge=true;
    map.features=[{kind:'bridge',x:9,y:8,width:3,depth:1,height:0},{kind:'tree',x:3,y:3,width:1,depth:1,height:3,variant:0},{kind:'mountain',x:12,y:12,width:5,depth:5,height:4,variant:1}];
    env.map=map;env.mapKey='terrain-fixture';
    renderers.terrain.drawFloor();renderers.terrain.drawPlayableGround();
    for(const feature of map.features.filter(f=>f.kind!=='bridge'))renderers.terrain.drawNaturalFeature(feature);
    delete env.map;delete env.mapKey;
    const densityDescriptor=Object.getOwnPropertyDescriptor(window,'devicePixelRatio');
    const originalPattern=activeContext.createPattern.bind(activeContext);
    let tilePatternWidth=0;
    activeContext.createPattern=(source,repetition)=>{
      const pattern=originalPattern(source,repetition),originalTransform=pattern.setTransform.bind(pattern);
      pattern.setTransform=matrix=>{tilePatternWidth=source.width*matrix.a;originalTransform(matrix);};
      return pattern;
    };
    for(const density of [1,1.5,2,3]){
      Object.defineProperty(window,'devicePixelRatio',{value:density,configurable:true});
      renderers.terrain.drawFloor();
      renderers.terrain.drawEnvironment();
      assert(Math.abs(tilePatternWidth-720)<.001,'Terrain pattern must preserve world tile size at every DPR');
      assert(Math.round(tilePatternWidth/env.T)%4===0,'Odd grid sizes must preserve checker parity');
    }
    if(densityDescriptor)Object.defineProperty(window,'devicePixelRatio',densityDescriptor);else delete window.devicePixelRatio;
    activeContext.createPattern=originalPattern;
    for(const theme of ['seljuk','winter','seljuk']){
      CrusaderAssets.setTheme(theme);
      renderers.terrain.drawFloor();
      for(const tile of [{x:2,y:2,obs:true},{x:3,y:3,rock:{color:'R',up:true}}]){
        renderers.terrain.drawWall(tile);renderers.terrain.drawIsoWall(tile);
      }
      const gateDrawImage=activeContext.drawImage.bind(activeContext);let gateDraws=0;
      activeContext.drawImage=(...args)=>{if(args[0]===castleGate)gateDraws++;gateDrawImage(...args);};
      for(let i=0;i<5;i++)renderers.terrain.drawGate(2,2,i);
      activeContext.drawImage=gateDrawImage;
      assert(gateDraws===5,'Every gate uses the castle asset');
      for(const [i,color] of ['R','B','D','W','P','G'].entries()){
        const unit={id:i+1,color,kind:'soul',x:2,y:2,lvl:2,cd:1,buff:0};
        renderers.towers.drawSoul(unit,50,50,10,1);
        renderers.towers.drawUnitSprite(unit,1);
      }
      for(const type of ['RBG','WPD']){
        const tower={id:20,color:'R',kind:'tower',type,lvl:1,x:2,y:2,cd:1};
        renderers.towers.drawTower(tower,50,50);renderers.towers.drawUnitSprite(tower,1);
      }
      for(const shape of ['s','d','t','normal'])for(const max of [100,600]){
        renderers.enemies.drawCrusader({id:1,x:2,y:2,hop:0,renderProgress:1,renderAngle:0,max,hp:50,shape,slow:true,shred:true},1);
      }
    }
    const oldContext=activeContext;activeContext=document.createElement('canvas').getContext('2d');
    renderers.towers.drawSoul({id:1,color:'R',kind:'soul',lvl:1},0,0,10,0);
    activeContext=oldContext;
    const directions=[[1,0],[0,1],[-1,0],[0,-1]];
    const cannonUnit={id:44,color:'R',kind:'tower',type:'RBG',x:2,y:2,lvl:1};
    for(const [column,[dx,dy]] of directions.entries()){
      for(const [row,age,cd,aiming] of [[0,1,1,false],[1,1,.5,true],[2,1,.1,true],[3,.05,1,true]]){
        const frame=CrusaderTowerMotion.cannonFrame(dx,dy,age,cd,aiming);
        assert(frame.column===column&&frame.row===row,'Cannon frame mapping');
        env.renderTime=age*1000;env.weaponMotion.set(44,{target:Math.atan2(dy,dx),fired:0});
        env.displayEnemies=aiming?[{x:2+dx,y:2+dy,renderProgress:1}]:[];
        renderers.towers.drawUnitSprite({...cannonUnit,cd},1);
      }
    }
    assert(CrusaderTowerMotion.cannonFrame(1,0,Infinity,0,false).row===0,'No firing without server event');
    const originalDrawImage=activeContext.drawImage.bind(activeContext);
    for(const [key,shape,max] of [['infantry','normal',100],['knight','s',100],['standardBearer','d',100],['scout','t',100],['siegeWagon','normal',600]]){
      const image=enemyImages[key],cw=image.naturalWidth/4,ch=image.naturalHeight/4;
      const atlas=document.createElement('canvas');atlas.width=image.naturalWidth;atlas.height=image.naturalHeight;
      const ac=atlas.getContext('2d');ac.drawImage(image,0,0);
      assert(ac.getImageData(0,0,1,1).data[3]===0,'Enemy atlas has transparent background: '+key);
      for(let column=0;column<4;column++)for(let row=0;row<4;row++){
        const pixels=ac.getImageData(Math.floor(column*cw),Math.floor(row*ch),Math.floor(cw),Math.floor(ch)).data;
        assert(pixels.some((value,i)=>i%4===3&&value>=24),'Enemy animation frame is populated: '+key);
        let crop;
        activeContext.drawImage=(...args)=>{if(args[0]===image)crop=args;originalDrawImage(...args);};
        renderers.enemies.drawCrusader({id:4,x:2,y:2,hop:0,renderAngle:[0,Math.PI/2,Math.PI,-Math.PI/2][column],renderProgress:row/4,max,hp:max,shape,slow:true,shred:true},1);
        assert(crop&&Math.abs(crop[1]-column*cw)<.001&&Math.abs(crop[2]-row*ch)<.001,'Enemy direction and walk crop: '+key);
        activeContext.drawImage=originalDrawImage;
      }
    }
    let lastCrop;
    const baselines=new Map();
    const footprint=env.T*CrusaderAssets.theme.towers.placement.footprint;
    const tilePolygon=CrusaderBoardGeometry.octagonPoints(-footprint/2,-footprint/2,footprint);
    activeContext.drawImage=(...args)=>{lastCrop=args;originalDrawImage(...args);};
    for(const [key,unitDefinition] of Object.entries(CrusaderAssets.theme.towers.units)){
      assert(loadedSheets[unitDefinition.animation],'Every unit has a loaded animation: '+key);
      const unit={id:80,color:key==='RBG'?'R':key==='WPD'?'W':key,kind:key.length>1?'tower':'soul',type:key,x:2,y:2,lvl:1};
      for(const [column,[dx,dy]] of directions.entries()){
        for(const [row,age,cd,aiming] of [[0,1,1,false],[1,1,.5,true],[2,1,.1,true],[3,.05,1,true]]){
          env.renderTime=age*1000;env.weaponMotion.set(80,{target:Math.atan2(dy,dx),fired:0});
          env.displayEnemies=aiming?[{x:2+dx,y:2+dy,renderProgress:1}]:[];
          const support=key==='G',time=support?[0,0,.25,.5][row]:age;
          renderers.towers.drawUnitSprite({...unit,cd,buffTargetId:support&&aiming?90:null},time);
          const expected=loadedSheets[unitDefinition.animation],cell=expected.naturalWidth/4;
          const frame=key==='W'?CrusaderMotion.archerFrame(dx,dy,age,cd,aiming):{column,row};
          assert(lastCrop[0]===expected&&lastCrop[1]===frame.column*cell&&lastCrop[2]===frame.row*cell,'Animation crop: '+key+' '+column+','+row);
          const pixels=alphaCtx;
          const resolution=Math.ceil(cell);
          alphaCanvas.width=resolution;alphaCanvas.height=resolution;pixels.drawImage(expected,frame.column*cell,frame.row*cell,cell,cell,0,0,resolution,resolution);
          const data=pixels.getImageData(0,0,resolution,resolution).data;
          let left=resolution,top=resolution,right=0,bottom=0;
          for(let y=0;y<resolution;y++)for(let x=0;x<resolution;x++)if(data[(y*resolution+x)*4+3]>=24){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x+1);bottom=Math.max(bottom,y+1);}
          left*=cell/resolution;top*=cell/resolution;right*=cell/resolution;bottom*=cell/resolution;
          const scale=lastCrop[7]/cell;
          const baseline=lastCrop[6]+bottom*scale;
          if(!baselines.has(key))baselines.set(key,baseline);
          assert(baseline>0&&Math.abs(baseline-baselines.get(key))<.001,'Feet stay planted at the front of the tile: '+key);
          assert((bottom-top)*scale>env.T*.4,'Character is large enough to read: '+key);
          for(const [px,py] of [[0,baseline]]){
            const screenX=px,screenY=py*1.65;
            const worldX=screenX*.5+screenY,worldY=screenY-screenX*.5;
            assert(tilePolygon.every(([ax,ay],i)=>{const [bx,by]=tilePolygon[(i+1)%8];return (bx-ax)*(worldY-ay)-(by-ay)*(worldX-ax)>=-.001;}),'Foot anchor stays on its tile: '+key+' '+column+','+row);
          }
        }
      }
    }
    const drummer={id:80,color:'G',kind:'soul',x:2,y:2,lvl:1,cd:1,buffTargetId:90,buffTarget:{x:3,y:2}};
    for(const phase of ['place','choose','ready','over','wave']){
      env.phase=phase;
      for(const time of [.1,.3,.6]){
        renderers.towers.drawUnitSprite(drummer,time);
        const expectedRow=phase==='wave'?CrusaderTowerMotion.directionalFrame(1,0,Infinity,1,true,'support',time).row:0;
        assert(lastCrop[0]===loadedSheets.drummerAnimation&&lastCrop[2]===expectedRow*loadedSheets.drummerAnimation.naturalHeight/4,'Drummer stops outside battle with a retained buff target: '+phase);
      }
    }
    env.phase='wave';
    renderers.towers.drawUnitSprite({...drummer,buffTargetId:null},.3);
    assert(lastCrop[2]===0,'Drummer waits without a buff target during battle');
    activeContext.drawImage=originalDrawImage;
    assert(CrusaderTowerMotion.directionalFrame(1,0,Infinity,0,false).row===0,'Idle until an attack event');
    assert(CrusaderTowerMotion.directionalFrame(1,0,0,0,false,'support',1).row===0,'Drummer waits without a support target');
    assert(CrusaderAssets.spriteKey({kind:'soul',color:'W'})==='archer','Archer mapping');
    assert(CrusaderAssets.listThemes().length===2,'Theme registry');
    let rejected=false;try{CrusaderAssets.setTheme('missing');}catch{rejected=true;}
    assert(rejected,'Unknown theme must fail');
    if(cameraMatch){
      const previewCamera=new Function('CrusaderMotion','return '+cameraMatch[1])(CrusaderMotion);
      canvas.width=1600;canvas.height=900;activeContext=canvas.getContext('2d');
      const m=previewCamera.matrix(1600,900,630);
      env.project=(x,y)=>({x:m.a*x+m.c*y+m.e,y:m.b*x+m.d*y+m.f,scale:m.a*1.65,width:1600,height:900});
      activeContext.setTransform(m.a,m.b,m.c,m.d,m.e,m.f);
      renderers.terrain.drawFloor();renderers.terrain.drawEnvironment();renderers.terrain.drawMapBoundary();
      for(let x=5;x<12;x++)renderers.terrain.drawIsoWall({x,y:8,obs:true});
      const preview=document.createElement('img');preview.id='terrainPreview';preview.src=canvas.toDataURL();document.body.append(preview);
      canvas.width=1200;canvas.height=720;activeContext=canvas.getContext('2d');
      const placementMatrix={a:3,b:1.5,c:-3,d:1.5,e:460,f:170};
      const pm=placementMatrix,det=pm.a*pm.d-pm.b*pm.c,s=pm.a*1.65;
      env.project=(x,y)=>({x:pm.a*x+pm.c*y+pm.e,y:pm.b*x+pm.d*y+pm.f,scale:s,width:1200,height:720});
      env.upright=(x,y,paint)=>{activeContext.save();activeContext.translate(x,y);activeContext.transform(pm.d*s/det,-pm.b*s/det,-pm.c*s/det,pm.a*s/det,0,0);paint();activeContext.restore();};
      activeContext.setTransform(pm.a,pm.b,pm.c,pm.d,pm.e,pm.f);renderers.terrain.drawFloor();
      env.displayEnemies=[];env.weaponMotion.clear();env.renderTime=1000;
      const previewUnits=['R','B','D','W','P','G','RBG','WPD'].map((key,index)=>({id:100+index,color:key==='RBG'?'R':key==='WPD'?'W':key,kind:key.length>1?'tower':'soul',type:key,x:index%4,y:Math.floor(index/4),lvl:1,cd:1}));
      for(const unit of previewUnits.sort((a,b)=>a.x+a.y-b.x-b.y))renderers.towers.drawUnitSprite(unit,1);
      const placement=document.createElement('img');placement.id='placementPreview';placement.src=canvas.toDataURL();document.body.append(placement);
    }
    out.textContent='PASS: syntax, terrain, all 8 unit animations, 128 readable frame crops, feet anchored on tiles, support timing, alpha, enemies, themes, context changes';
  }catch(error){out.textContent='FAIL: '+error.stack;}
})();
'@
$test=$test.Replace('GAME_SOURCE',$game).Replace('ARCHER_DATA',$archer).Replace('ANIMATION_DATA',$animation).Replace('CANNON_DATA',$cannon).Replace('NEW_SHEET_DATA',$newSheetData).Replace('GRASS_DATA',$grass).Replace('TREE_DATA',$trees).Replace('MOUNTAIN_DATA',$mountains).Replace('CASTLE_GATE_DATA',$castleGate)
$test=$test.Replace('ENEMY_SHEET_DATA',$enemySheetData).Replace('WATER_DATA',$water).Replace('BRIDGE_DATA',$bridge)
$html='<!doctype html><html><body><pre id="result">RUNNING</pre><script>'+$code+"`n"+$test+'</script></body></html>'
$testPath=Join-Path $testDirectory 'smoke.html'
[IO.File]::WriteAllText($testPath,$html,[Text.UTF8Encoding]::new($false))
$edge='C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
if(!(Test-Path -LiteralPath $edge)){throw 'Microsoft Edge is required for this browser check.'}
$uri=([Uri]$testPath).AbsoluteUri
$runId=[Guid]::NewGuid().ToString('N')
$profile=Join-Path $testDirectory ('profile-'+$runId)
$output=Join-Path $testDirectory ('result-'+$runId+'.html')
$errors=Join-Path $testDirectory ('edge-'+$runId+'.log')
$process=Start-Process -FilePath $edge -ArgumentList @('--headless','--disable-gpu','--no-first-run',('--user-data-dir="'+$profile+'"'),'--virtual-time-budget=15000','--dump-dom',$uri) -WindowStyle Hidden -PassThru -RedirectStandardOutput $output -RedirectStandardError $errors
if(!$process.WaitForExit(45000)){$process.Kill();throw 'Board check timed out.'}
$deadline=[DateTime]::UtcNow.AddSeconds(40)
do{
  $stream=[IO.File]::Open($output,[IO.FileMode]::Open,[IO.FileAccess]::Read,[IO.FileShare]::ReadWrite)
  $reader=[IO.StreamReader]::new($stream)
  $result=$reader.ReadToEnd();$reader.Dispose()
  $match=[regex]::Match($result,'(?s)<pre id="result">(.*?)</pre>')
  if($match.Success -and $match.Groups[1].Value -ne 'RUNNING'){break}
  Start-Sleep -Milliseconds 250
}while([DateTime]::UtcNow -lt $deadline)
Write-Output $match.Groups[1].Value
if(!$match.Success -or !$match.Groups[1].Value.StartsWith('PASS:')){throw "Board check failed. See $errors"}
$terrainPreview=[regex]::Match($result,'id="terrainPreview" src="data:image/png;base64,([^\"]+)"')
if($terrainPreview.Success){[IO.File]::WriteAllBytes((Join-Path $testDirectory 'terrain-preview.png'),[Convert]::FromBase64String($terrainPreview.Groups[1].Value))}
$placementPreview=[regex]::Match($result,'id="placementPreview" src="data:image/png;base64,([^\"]+)"')
if($placementPreview.Success){[IO.File]::WriteAllBytes((Join-Path $testDirectory 'placement-preview.png'),[Convert]::FromBase64String($placementPreview.Groups[1].Value))}

# Smoke check the assembled page against the real API in a separate browser session.
$liveOutput=Join-Path $testDirectory ('live-'+$runId+'.html')
$liveErrors=Join-Path $testDirectory ('live-'+$runId+'.log')
$liveProfile=Join-Path $testDirectory ('live-profile-'+$runId)
$liveShot=Join-Path $testDirectory 'live-terrain.png'
$live=Start-Process -FilePath $edge -ArgumentList @('--headless','--disable-gpu','--no-first-run',('--user-data-dir="'+$liveProfile+'"'),'--window-size=1600,900','--virtual-time-budget=8000',('--screenshot="'+$liveShot+'"'),'--dump-dom',$BaseUrl) -WindowStyle Hidden -PassThru -RedirectStandardOutput $liveOutput -RedirectStandardError $liveErrors
if(!$live.WaitForExit(45000)){$live.Kill();throw 'Live board check timed out.'}
$deadline=[DateTime]::UtcNow.AddSeconds(30)
do{
  $stream=[IO.File]::Open($liveOutput,[IO.FileMode]::Open,[IO.FileAccess]::Read,[IO.FileShare]::ReadWrite)
  $reader=[IO.StreamReader]::new($stream);$liveHtml=$reader.ReadToEnd();$reader.Dispose()
  if($liveHtml.Contains('</html>')){break}
  Start-Sleep -Milliseconds 250
}while([DateTime]::UtcNow -lt $deadline)
if(!$liveHtml.Contains('data-tool="soul"') -or !$liveHtml.Contains('0/5 ruh kondu')){throw "Assembled game did not initialize. See $liveOutput"}
Write-Output 'PASS: assembled game page initializes with the real server API.'
if($CapturePreview){
  foreach($size in @('1600,900','640,900')){
    $shot=Join-Path $testDirectory ('hud-'+$size.Replace(',','x')+'.png')
    $shotProfile=Join-Path $testDirectory ('shot-'+$runId+'-'+$size.Replace(',','x'))
    $preview=Start-Process -FilePath $edge -ArgumentList @('--headless','--disable-gpu','--no-first-run',('--user-data-dir="'+$shotProfile+'"'),('--window-size='+$size),'--virtual-time-budget=4000',('--screenshot="'+$shot+'"'),$BaseUrl) -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $testDirectory 'preview.log') -RedirectStandardError (Join-Path $testDirectory 'preview-errors.log')
    if(!$preview.WaitForExit(30000)){$preview.Kill();throw 'Preview timed out.'}
    $deadline=[DateTime]::UtcNow.AddSeconds(10)
    while(!(Test-Path -LiteralPath $shot) -and [DateTime]::UtcNow -lt $deadline){Start-Sleep -Milliseconds 250}
    Write-Output $shot
  }
}
