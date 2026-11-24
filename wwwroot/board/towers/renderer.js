'use strict';
CrusaderAssets.registerRenderer('towers',env=>{
const spriteLayoutCache=new WeakMap();
function spriteLayout(image,columns,rows){
  let layout=spriteLayoutCache.get(image);
  if(layout?.width===image.naturalWidth&&layout.columns===columns&&layout.rows===rows)return layout;
  const cw=image.naturalWidth/columns,ch=image.naturalHeight/rows;
  const canvas=document.createElement('canvas');canvas.width=Math.ceil(cw);canvas.height=Math.ceil(ch);
  const context=canvas.getContext('2d',{willReadFrequently:true});
  const frames=[];
  try{
    for(let row=0;row<rows;row++)for(let column=0;column<columns;column++){
      context.clearRect(0,0,canvas.width,canvas.height);
      context.drawImage(image,column*cw,row*ch,cw,ch,0,0,canvas.width,canvas.height);
      const pixels=context.getImageData(0,0,canvas.width,canvas.height).data;
      let left=canvas.width,top=canvas.height,right=0,bottom=0;
      for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){
        if(pixels[(y*canvas.width+x)*4+3]<24)continue;
        left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x+1);bottom=Math.max(bottom,y+1);
      }
      frames.push(right>left?{left:left*cw/canvas.width,top:top*ch/canvas.height,right:right*cw/canvas.width,bottom:bottom*ch/canvas.height}:{left:0,top:0,right:cw,bottom:ch});
    }
  }catch{
    frames.length=0;
    for(let i=0;i<columns*rows;i++)frames.push({left:0,top:0,right:cw,bottom:ch*.9});
  }
  // Keep horizontal anchors stable within each facing; remove vertical atlas padding.
  const anchors=frames.slice(0,columns).map(bounds=>(bounds.left+bounds.right)/2);
  const maxWidth=Math.max(...frames.map((bounds,i)=>2*Math.max(anchors[i%columns]-bounds.left,bounds.right-anchors[i%columns])));
  const maxHeight=Math.max(...frames.map(bounds=>bounds.bottom-bounds.top));
  layout={width:image.naturalWidth,columns,rows,cw,ch,frames,anchors,maxWidth,maxHeight};
  spriteLayoutCache.set(image,layout);return layout;
}
function drawSpriteFrame(image,columns,rows,column,row,u,definition={},flip=false){
  const {ctx,T,theme}=env,layout=spriteLayout(image,columns,rows);
  const placement=theme.towers.placement||{},bounds=layout.frames[row*columns+column];
  const height=T*(definition.height||placement[u.kind==='tower'?'towerHeight':'soulHeight']||1.08);
  const maxWidth=T*(placement.spriteWidth||1.04);
  // Upright characters rise above the tile; only their feet belong on its surface.
  const scale=Math.min(height/layout.maxHeight,maxWidth/layout.maxWidth);
  const baseline=T*.12;
  ctx.save();if(flip)ctx.scale(-1,1);
  ctx.drawImage(image,column*layout.cw,row*layout.ch,layout.cw,layout.ch,-layout.anchors[column]*scale,baseline-bounds.bottom*scale,layout.cw*scale,layout.ch*scale);
  ctx.restore();
}
function drawUnitFoundation(u){
  const {ctx,T,theme,COL,mix}=env;
  const onWall=!!env.map?.grid[u.y]?.[u.x]?.rock,lift=onWall?T*.32:0;
  const width=T*(onWall?.62:theme.towers.placement?.footprint||1),height=T*.035;
  const x=(u.x+.5)*T-lift,y=(u.y+.5)*T-lift,color=COL[u.color].hex;
  const ground=CrusaderBoardGeometry.octagonPoints(x-width/2,y-width/2,width);
  const top=ground.map(([px,py])=>[px-height,py-height]);
  const face=(points,fill)=>{ctx.beginPath();points.forEach(([px,py],i)=>i?ctx.lineTo(px,py):ctx.moveTo(px,py));ctx.closePath();ctx.fillStyle=fill;ctx.fill();};
  ctx.save();
  face(ground.map(([px,py])=>[px+T*.025,py+T*.04]),'#12231960');
  for(let i=2;i<7;i++)face([top[i],top[(i+1)%8],ground[(i+1)%8],ground[i]],i<4?'#49565b':'#354349');
  face(top,mix(color,.12,theme.towers.appearance.platform));
  ctx.strokeStyle=theme.towers.appearance.outline;ctx.lineWidth=T*.025;ctx.stroke();
  CrusaderBoardGeometry.octagonPath(ctx,x-height-width*.44,y-height-width*.44,width*.88);
  ctx.strokeStyle=mix(color,.65,'#b8aa76');ctx.lineWidth=T*.026;ctx.stroke();
  ctx.restore();return {x:x-height,y:y-height};
}
function drawWeapon(u,X,Y,size){
  const {ctx,T,COL,TOWERS,weaponMotion,frameDt,renderTime,displayEnemies,statsOf,spriteFor,archerSheet,upright,drawPlinth,mix,shapePath,theme,weaponFor}=env;
  const weapon=weaponFor(u),color=COL[u.color].hex;
  let pose=weaponMotion.get(u.id);
  if(!pose){pose={angle:-Math.PI/2,target:-Math.PI/2,fired:-Infinity};weaponMotion.set(u.id,pose);}
  const delta=Math.atan2(Math.sin(pose.target-pose.angle),Math.cos(pose.target-pose.angle));
  pose.angle+=delta*(1-Math.exp(-14*frameDt));
  const age=(renderTime-pose.fired)/1000,kick=age>=0&&age<.20?Math.sin(age/.20*Math.PI)*size*.15:0;
  ctx.save();ctx.translate(X,Y);ctx.rotate(pose.angle+Math.PI/2);ctx.lineCap='round';ctx.lineJoin='round';
  ctx.strokeStyle='#172632';ctx.lineWidth=2;ctx.fillStyle=color;
  if(weapon==='cannon'){
    ctx.fillStyle='#344450';ctx.fillRect(-size*.74,size*.03,size*1.48,size*.50);
    for(const x of [-size*.66,size*.66]){ctx.beginPath();ctx.arc(x,size*.32,size*.22,0,Math.PI*2);ctx.fill();ctx.stroke();}
    ctx.fillStyle=color;ctx.fillRect(-size*.29,-size*.85+kick,size*.58,size*1.07);ctx.strokeRect(-size*.29,-size*.85+kick,size*.58,size*1.07);
    ctx.fillStyle='#172632';ctx.fillRect(-size*.21,-size*.91+kick,size*.42,size*.16);
    ctx.strokeStyle='#ffffff88';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-size*.12,-size*.66+kick);ctx.lineTo(-size*.12,size*.05);ctx.stroke();
  }else if(weapon==='catapult'){
    ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(-size*.7,size*.55);ctx.lineTo(0,-size*.35);ctx.lineTo(size*.7,size*.55);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.strokeStyle='#172632';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(0,size*.4);ctx.lineTo(kick,-size*.8);ctx.stroke();
    ctx.fillStyle='#e8e0cb';ctx.beginPath();ctx.arc(kick,-size*.8,size*.20,0,Math.PI*2);ctx.fill();ctx.stroke();
  }else if(weapon==='drummer'){
    ctx.beginPath();ctx.ellipse(0,size*.10,size*.58,size*.40,0,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.fillStyle='#dbc990';ctx.beginPath();ctx.ellipse(0,-size*.05,size*.58,size*.28,0,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.strokeStyle=color;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-size*.58,-size*.6);ctx.lineTo(size*.10,size*.10);ctx.moveTo(size*.58,-size*.6);ctx.lineTo(-size*.10,size*.10);ctx.stroke();
  }else{
    ctx.strokeStyle='#172632';ctx.lineWidth=5;ctx.beginPath();ctx.arc(0,-size*.25,size*.72,Math.PI*.10,Math.PI*.90);ctx.stroke();
    ctx.strokeStyle=color;ctx.lineWidth=3;ctx.stroke();
    ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(-size*.68,-size*.03);ctx.lineTo(0,size*.14+kick);ctx.lineTo(size*.68,-size*.03);ctx.stroke();
    ctx.strokeStyle='#172632';ctx.lineWidth=2;
    for(const offset of (weapon==='volley'?[-.22,0,.22]:[0])){const x=offset*size;ctx.beginPath();ctx.moveTo(x,size*.45);ctx.lineTo(x,-size*.77);ctx.moveTo(x-size*.13,-size*.58);ctx.lineTo(x,-size*.77);ctx.lineTo(x+size*.13,-size*.58);ctx.stroke();}
  }
  ctx.restore();
}
function drawSoldier(u,X,Y,size){
  const {ctx,T,COL,TOWERS,weaponMotion,frameDt,renderTime,displayEnemies,statsOf,spriteFor,archerSheet,upright,drawPlinth,mix,shapePath,theme}=env;
  const col=COL[u.color].hex;
  ctx.save();ctx.translate(X,Y);ctx.lineWidth=Math.max(1,size*.10);ctx.strokeStyle=theme.towers.appearance.outline;ctx.lineCap='round';
  ctx.strokeStyle=theme.towers.appearance.boots;ctx.lineWidth=size*.23;
  ctx.beginPath();ctx.moveTo(-size*.18,size*.22);ctx.lineTo(-size*.25,size*.66);ctx.moveTo(size*.18,size*.22);ctx.lineTo(size*.25,size*.66);ctx.stroke();
  ctx.fillStyle=col;ctx.strokeStyle=theme.towers.appearance.outline;ctx.lineWidth=Math.max(1,size*.08);
  ctx.beginPath();ctx.moveTo(-size*.38,-size*.26);ctx.lineTo(size*.38,-size*.26);ctx.lineTo(size*.30,size*.33);ctx.lineTo(-size*.30,size*.33);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.strokeStyle=theme.towers.appearance.skin;ctx.lineWidth=size*.15;ctx.beginPath();ctx.moveTo(-size*.35,-size*.16);ctx.lineTo(-size*.50,size*.15);ctx.moveTo(size*.35,-size*.16);ctx.lineTo(size*.50,size*.15);ctx.stroke();
  ctx.fillStyle=theme.towers.appearance.skin;ctx.beginPath();ctx.arc(0,-size*.48,size*.22,0,Math.PI*2);ctx.fill();ctx.strokeStyle=theme.towers.appearance.outline;ctx.lineWidth=1;ctx.stroke();
  ctx.fillStyle=theme.towers.appearance.helmet;ctx.beginPath();ctx.arc(0,-size*.53,size*.25,Math.PI,Math.PI*2);ctx.fill();
  ctx.fillStyle='#172632';ctx.fillRect(-size*.11,-size*.50,size*.05,size*.04);ctx.fillRect(size*.06,-size*.50,size*.05,size*.04);
  drawWeapon(u,size*.37,size*.15,size*.36);ctx.restore();
}
function drawTower(u,X,Y){
  const {ctx,T,COL,TOWERS,weaponMotion,frameDt,renderTime,displayEnemies,statsOf,spriteFor,archerSheet,upright,drawPlinth,mix,shapePath,theme}=env;
  const color=COL[u.color].hex;ctx.save();
  const raised=drawPlinth(X,Y,T*.88,T*.12,color);X=raised.x;Y=raised.y;
  CrusaderBoardGeometry.octagonPath(ctx,X-T*.43,Y-T*.43,T*.86);
  ctx.fillStyle=theme.towers.appearance.platform;ctx.fill();
  ctx.strokeStyle=color;ctx.lineWidth=2;ctx.stroke();
  const colors=TOWERS[u.type].need;
  colors.forEach((color,i)=>drawSoldier({...u,id:u.id*10+i,color,kind:'soul'},X+(i-1)*T*.25,Y+(i===1?-T*.12:T*.09),T*.26));
  drawWeapon(u,X,Y+T*.18,T*.23);
  TOWERS[u.type].need.forEach((k,i)=>{ctx.fillStyle=COL[k].hex;ctx.fillRect(X+(i-1)*T*.19-T*.05,Y+T*.33,T*.1,T*.05);});
  ctx.restore();
}
function drawSoul(u,x,y,r,now){
  const {ctx,T,COL,TOWERS,weaponMotion,frameDt,renderTime,displayEnemies,statsOf,spriteFor,archerSheet,upright,drawPlinth,mix,shapePath,theme}=env;
  const col=COL[u.color].hex,pulse=1+Math.sin(now*3+u.id)*.05;
  ctx.save();
  const raised=drawPlinth(x,y,T*.88,T*.12,col);x=raised.x;y=raised.y;
  ctx.fillStyle='#25313b40';ctx.fillRect(x-T*.41,y-T*.40,T*.87,T*.87);
  CrusaderBoardGeometry.octagonPath(ctx,x-T*.44,y-T*.44,T*.88);
  ctx.fillStyle=mix(col,.28,'#bac8cf');ctx.fill();
  ctx.strokeStyle='#26323d';ctx.lineWidth=2;ctx.stroke();
  CrusaderBoardGeometry.octagonPath(ctx,x-T*.39,y-T*.39,T*.78);
  ctx.strokeStyle=col;ctx.lineWidth=2;ctx.stroke();
  drawSoldier(u,x,y-T*.03,T*.48);
  ctx.fillStyle='#1e303f';ctx.fillRect(x+T*.23,y+T*.23,T*.22,T*.22);
  shapePath(ctx,u.color,x+T*.34,y+T*.34,T*.085*pulse);ctx.fillStyle=col;ctx.fill();ctx.strokeStyle='#edf3f5';ctx.lineWidth=.7;ctx.stroke();
  ctx.restore();
  if(u.lvl>1){ctx.fillStyle='#1e303f';ctx.fillRect(x-T*.45,y+T*.21,T*.25,T*.25);ctx.font=`700 ${Math.max(9,Math.round(T*.25))}px ${getComputedStyle(document.body).getPropertyValue('--f-mono')}`;ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillStyle='#ffffff';ctx.fillText(u.lvl,x-T*.325,y+T*.34);}
}
function drawUnitSprite(u,now){
  const {ctx,T,COL,TOWERS,weaponMotion,frameDt,renderTime,displayEnemies,statsOf,spriteFor,animationFor,animationDefinitionFor,archerSheet,upright,drawPlinth,mix,shapePath,theme}=env;
  const image=spriteFor(u);
  const definition=animationDefinitionFor(u),sheet=animationFor(u);
  const directionalSheet=definition?.embedded?sheet:null;
  const loaded=(image?.complete&&image.naturalWidth)||(directionalSheet?.complete&&directionalSheet.naturalWidth);
  const anchor=loaded?drawUnitFoundation(u):{x:(u.x+.5)*T,y:(u.y+.5)*T};
  upright(anchor.x,anchor.y,()=>{
    if(loaded){
      if(directionalSheet?.complete&&directionalSheet.naturalWidth){
        const pose=weaponMotion.get(u.id),age=pose?(renderTime-pose.fired)/1000:Infinity;
        const target=displayEnemies.filter(e=>Math.hypot(e.x-u.x,e.y-u.y)<=statsOf(u).range).sort((a,b)=>b.renderProgress-a.renderProgress)[0];
        let angle=pose?.target??0;
        if(target&&age>.40)angle=Math.atan2(target.y-u.y,target.x-u.x);
        const supporting=definition.mode==='support'&&env.phase==='wave'&&!!u.buffTargetId;
        if(definition.mode==='support')angle=u.buffTarget?Math.atan2(u.buffTarget.y-u.y,u.buffTarget.x-u.x):pose?.target??0;
        const frame=CrusaderTowerMotion.directionalFrame(Math.cos(angle),Math.sin(angle),age,u.cd/(1+(u.buff||0)),definition.mode==='support'?supporting:!!target,definition.mode,now);
        drawSpriteFrame(directionalSheet,definition.columns,definition.rows,frame.column,frame.row,u,definition);
      }else if(u.kind!=='tower'&&u.color==='W'&&archerSheet.complete&&archerSheet.naturalWidth){
        const pose=weaponMotion.get(u.id),age=pose?(renderTime-pose.fired)/1000:Infinity;
        const target=displayEnemies.filter(e=>Math.hypot(e.x-u.x,e.y-u.y)<=statsOf(u).range).sort((a,b)=>b.renderProgress-a.renderProgress)[0];
        let angle=pose?.target??0;
        if(target&&age>.32)angle=Math.atan2(target.y-u.y,target.x-u.x);
        const frame=CrusaderMotion.archerFrame(Math.cos(angle),Math.sin(angle),age,u.cd/(1+(u.buff||0)),!!target);
        drawSpriteFrame(archerSheet,4,4,frame.column,frame.row,u,{},frame.flip);
      }else drawSpriteFrame(image,1,1,0,0,u);
    }else if(u.kind==='tower')drawTower(u,0,-T*.25);else drawSoul(u,0,-T*.25,T*.36,now);
  });
}
return {drawWeapon,drawSoldier,drawTower,drawSoul,drawUnitSprite};
});
