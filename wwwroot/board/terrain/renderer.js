'use strict';
CrusaderAssets.registerRenderer('terrain',env=>{
let floorCanvas=null,floorKey='';
let environmentKey='',environmentNodes=[];
let environmentCanvas=null,environmentFrameKey='';
const atlasBoundsCache=new WeakMap();
function spriteBounds(image,definition,variant){
  let entries=atlasBoundsCache.get(image);
  if(!entries){entries=new Map();atlasBoundsCache.set(image,entries);}
  if(entries.has(variant))return entries.get(variant);
  const cw=image.naturalWidth/definition.columns,ch=image.naturalHeight/definition.rows;
  const canvas=document.createElement('canvas');canvas.width=Math.ceil(cw);canvas.height=Math.ceil(ch);
  const c=canvas.getContext('2d',{willReadFrequently:true});
  c.drawImage(image,(variant%definition.columns)*cw,Math.floor(variant/definition.columns)*ch,cw,ch,0,0,canvas.width,canvas.height);
  let bounds={left:0,top:0,right:1,bottom:1};
  try{
    const pixels=c.getImageData(0,0,canvas.width,canvas.height).data;
    let left=canvas.width,top=canvas.height,right=0,bottom=0;
    const inset=definition.spriteInsets?.[variant]||{},startX=Math.ceil((inset.left||0)*canvas.width);
    for(let y=0;y<canvas.height;y++)for(let x=startX;x<canvas.width;x++)if(pixels[(y*canvas.width+x)*4+3]>=16){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x+1);bottom=Math.max(bottom,y+1);}
    if(right>left&&bottom>top)bounds={left:left/canvas.width,top:top/canvas.height,right:right/canvas.width,bottom:bottom/canvas.height};
  }catch{/* External images without CORS use their full sprite bounds. */}
  entries.set(variant,bounds);return bounds;
}
function drawFloor(){
  const {ctx,T,N,COL,THEME,mix,theme,terrainTexture,map,environmentImages}=env;
  // A four-tile period keeps checker parity and texture seams aligned for odd N.
  const tileCount=Math.ceil(N/4)*4,W=tileCount*T,dpr=window.devicePixelRatio||1;
  const textured=!!theme.terrain.texture&&terrainTexture?.complete&&terrainTexture.naturalWidth>0;
  const water=environmentImages?.water,waterReady=!!(water?.complete&&water.naturalWidth);
  const key=`${theme.id}:${W}:${dpr}:${textured}:${env.mapKey||''}:${waterReady}`;
  if(key!==floorKey){
    floorKey=key;floorCanvas=document.createElement('canvas');floorCanvas.width=W*dpr;floorCanvas.height=W*dpr;
    const c=floorCanvas.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);
    c.fillStyle=THEME.floor;c.fillRect(0,0,W,W);
    if(textured){
      c.globalAlpha=.78;
      for(let y=0;y<tileCount;y+=4)for(let x=0;x<tileCount;x+=4)c.drawImage(terrainTexture,x*T,y*T,T*4,T*4);
      c.globalAlpha=1;c.fillStyle='#15342236';c.fillRect(0,0,W,W);
    }
    for(let y=0;y<tileCount;y++)for(let x=0;x<tileCount;x++){
      const tone=(x*17+y*31)%7;
      c.globalAlpha=textured?.14:1;
      CrusaderBoardGeometry.octagonPath(c,x*T,y*T,T,.35);
      c.fillStyle=mix((x+y)%2?theme.terrain.floor.dark:theme.terrain.floor.light,.93+tone*.01,'#27352f');c.fill();
      c.globalAlpha=1;
      // Boundaries use the same x*T/y*T coordinates as units and hit testing.
      c.strokeStyle=textured?'#19352370':'#15231c50';c.lineWidth=.8;c.stroke();
    }
  }
  // Continue the terrain beyond the playable grid so the world covers the viewport.
  const pattern=ctx.createPattern(floorCanvas,'repeat');
  // The cache is in device pixels; the game grid is in world units.
  pattern.setTransform(new DOMMatrix().scale(1/dpr));
  ctx.save();ctx.fillStyle='#000';ctx.fillRect(-W*12,-W*12,W*25,W*25);ctx.fillStyle=pattern;ctx.fillRect(0,0,N*T,N*T);
  // Leave the forest and mountain belt lit, with darkness beyond its outer edge.
  const outer=0;
  ctx.beginPath();ctx.rect(-W*12,-W*12,W*25,W*25);
  ctx.rect(-outer,-outer,N*T+outer*2,N*T+outer*2);
  ctx.fillStyle='#000';ctx.fill('evenodd');ctx.restore();
  if(map?.grid){
    ctx.save();
    for(const row of map.grid)for(const tile of row)if(tile.terrain==='water'){
      if(waterReady)ctx.drawImage(water,tile.x*T,tile.y*T,T,T);
      else{ctx.fillStyle='#258d9f';ctx.fillRect(tile.x*T,tile.y*T,T,T);}
      ctx.strokeStyle='#8fdcdb55';ctx.lineWidth=.5;ctx.strokeRect(tile.x*T,tile.y*T,T,T);
    }
    ctx.restore();
  }
}
function drawPlayableGround(){
  const {ctx,T,map,environmentImages,theme}=env,image=environmentImages?.bridge,definition=theme.terrain.images?.bridge;
  for(const feature of map?.features||[])if(feature.kind==='mountain'||feature.kind==='gate')drawFeatureFootprint(feature);
  if(!map?.features||!image?.complete||!image.naturalWidth||!definition)return;
  const b=spriteBounds(image,definition,0),iw=image.naturalWidth,ih=image.naturalHeight;
  for(const feature of map.features)if(feature.kind==='bridge'){
    ctx.drawImage(image,b.left*iw,b.top*ih,(b.right-b.left)*iw,(b.bottom-b.top)*ih,feature.x*T,feature.y*T,feature.width*T,feature.depth*T);
  }
}
function drawFeatureFootprint(feature,highlight=false){
  const {ctx,T}=env;ctx.save();
  ctx.fillStyle=highlight?'#c9a46028':feature.kind==='mountain'?'#55432b70':'#c1ae7428';
  ctx.fillRect(feature.x*T,feature.y*T,feature.width*T,feature.depth*T);
  ctx.strokeStyle=highlight?'#ffdb86':'#b6a17ecc';ctx.lineWidth=highlight?1.8:.8;
  for(let y=feature.y;y<feature.y+feature.depth;y++)for(let x=feature.x;x<feature.x+feature.width;x++)ctx.strokeRect(x*T,y*T,T,T);
  ctx.lineWidth=highlight?2.5:1.6;ctx.strokeRect(feature.x*T,feature.y*T,feature.width*T,feature.depth*T);ctx.restore();
}
function drawNaturalFeature(feature){
  const {ctx,T,environmentImages,theme,upright}=env;
  if(feature.kind==='gate'){
    upright((feature.x+feature.width/2)*T,(feature.y+feature.depth/2)*T,()=>{
      ctx.save();ctx.scale(2.2,2.2);drawGate(-.5,-.92,feature.variant);ctx.restore();
    });return;
  }
  const key=feature.kind==='tree'?'trees':'mountains',image=environmentImages[key],definition=theme.terrain.environment[key];
  if(!image?.complete||!image.naturalWidth)return;
  const variant=feature.variant||0,b=spriteBounds(image,definition,variant),cw=image.naturalWidth/definition.columns,ch=image.naturalHeight/definition.rows;
  const sx=(variant%definition.columns+b.left)*cw,sy=(Math.floor(variant/definition.columns)+b.top)*ch;
  const sw=(b.right-b.left)*cw,sh=(b.bottom-b.top)*ch;
  if(feature.kind==='mountain'){
    // Keep the painted isometric sprite upright and preserve its proportions.
    const {project}=env,cx=(feature.x+feature.width/2)*T,cy=(feature.y+feature.depth/2)*T;
    const corners=[[feature.x,feature.y],[feature.x+feature.width,feature.y],[feature.x+feature.width,feature.y+feature.depth],[feature.x,feature.y+feature.depth]].map(([x,y])=>project(x*T,y*T));
    const center=project(cx,cy),width=(Math.max(...corners.map(p=>p.x))-Math.min(...corners.map(p=>p.x)))/center.scale;
    const height=width*sh/sw,bottom=(Math.max(...corners.map(p=>p.y))-center.y)/center.scale;
    upright(cx,cy,()=>ctx.drawImage(image,sx,sy,sw,sh,-width/2,bottom-height,width,height));
    return;
  }
  const height=feature.height*T*.72,width=height*sw/sh;
  const maxWidth=T*(feature.kind==='tree'?1.15:4.2),drawWidth=Math.min(width,maxWidth),drawHeight=height;
  upright((feature.x+feature.width/2)*T,(feature.y+feature.depth/2)*T,()=>{
    if(feature.kind==='tree'){ctx.fillStyle='#10251c66';ctx.beginPath();ctx.ellipse(0,T*.12,drawWidth*.35,T*.18,0,0,Math.PI*2);ctx.fill();}
    ctx.drawImage(image,sx,sy,sw,sh,-drawWidth/2,T*.12-drawHeight,drawWidth,drawHeight);
  });
}
function drawEnvironment(){
  const {ctx,T,N,theme,environmentImages,project}=env;
  if(env.map?.grid)return;
  if(!theme.terrain.environment||!environmentImages)return;
  const key=`${N}:${theme.id}`;
  if(key!==environmentKey){environmentNodes=CrusaderBoardGeometry.environmentNodes(N);environmentKey=key;}
  const origin=project(0,0),dpr=window.devicePixelRatio||1;
  const frameKey=[key,T,origin.x,origin.y,origin.scale,origin.width,origin.height,dpr,...Object.values(environmentImages).map(image=>image.complete?image.naturalWidth:0)].join(':');
  if(frameKey!==environmentFrameKey){
    environmentFrameKey=frameKey;environmentCanvas=document.createElement('canvas');
    environmentCanvas.width=origin.width*dpr;environmentCanvas.height=origin.height*dpr;
    const c=environmentCanvas.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);
    const mapPolygon=[[0,0],[N*T,0],[N*T,N*T],[0,N*T]].map(([x,y])=>{const p=project(x,y);return [p.x,p.y];});
    const items=[];
    for(const node of environmentNodes){
      const image=environmentImages[node.kind],definition=theme.terrain.environment[node.kind];
      if(!image?.complete||!image.naturalWidth)continue;
      const p=project(node.x*T,node.y*T),size=T*node.size*p.scale;
      const b=spriteBounds(image,definition,node.variant),x=p.x-size*.5,y=p.y-size*.91;
      items.push({node,image,definition,p,size,bounds:{left:x+b.left*size,top:y+b.top*size,right:x+b.right*size,bottom:y+b.bottom*size}});
    }
    // Remove complete sprites rather than clipping their crowns or rock faces.
    for(const {node,image,definition,p,size,bounds} of CrusaderBoardGeometry.filterEnvironment(items,mapPolygon)){
      if(bounds.right<0||bounds.left>origin.width||bounds.bottom<0||bounds.top>origin.height)continue;
      const cw=image.naturalWidth/definition.columns,ch=image.naturalHeight/definition.rows;
      c.drawImage(image,(node.variant%definition.columns)*cw,Math.floor(node.variant/definition.columns)*ch,cw,ch,p.x-size*.5,p.y-size*.91,size,size);
    }
  }
  ctx.save();ctx.setTransform(dpr,0,0,dpr,0,0);ctx.drawImage(environmentCanvas,0,0,origin.width,origin.height);ctx.restore();
}
function drawMapBoundary(){
  const {ctx,T,N,theme,project}=env;
  const scale=Math.max(.01,project(0,0).scale/1.65);
  ctx.save();ctx.beginPath();ctx.rect(0,0,N*T,N*T);
  ctx.strokeStyle='#192016';ctx.lineWidth=5/scale;ctx.stroke();
  ctx.strokeStyle=theme.terrain.boundary||'#f2cc58';ctx.lineWidth=2/scale;ctx.stroke();
  ctx.restore();
}
function drawWall(tile){
  const {ctx,T,N,COL,THEME,mix,theme}=env;
  const x=tile.x*T,y=tile.y*T,p=T*.065,w=T-p*2,high=tile.obs||tile.rock?.up;
  const color=tile.rock?COL[tile.rock.color].hex:null,base=color?mix(color,.62,'#87909a'):THEME.stone;
  const depth=T*(high ? .18 : .10),cut=T*.07,frontY=y+p+depth;
  // Cut stone silhouette, dark mortar, beveled cap and offset cast shadow.
  ctx.save();ctx.fillStyle='#1e272c38';ctx.fillRect(x+p+T*.06,y+p+T*.10,w,w);
  ctx.beginPath();ctx.moveTo(x+p+cut,y+p);ctx.lineTo(x+T-p-cut,y+p);ctx.lineTo(x+T-p,y+p+cut);ctx.lineTo(x+T-p,y+T-p);ctx.lineTo(x+p,y+T-p);ctx.lineTo(x+p,y+p+cut);ctx.closePath();
  ctx.fillStyle='#343c45';ctx.fill();ctx.strokeStyle='#2d333b';ctx.lineWidth=Math.max(1,T*.045);ctx.stroke();
  const rows=high?3:2,height=w-depth,rowHeight=height/rows;
  for(let row=0;row<rows;row++){
    const offset=row%2?w*.24:0;
    for(let col=-1;col<3;col++){
      const left=Math.max(0,col*w*.5+offset),right=Math.min(w,(col+1)*w*.5+offset);
      if(right<=left)continue;
      const seed=(tile.x*7+tile.y*11+row*3+col+20)%5;
      ctx.fillStyle=mix(base,.84+seed*.025,'#333d49');ctx.fillRect(x+p+left+1,frontY+row*rowHeight+1,right-left-2,rowHeight-2);
      ctx.strokeStyle=mix(base,.65,'#edf0f2');ctx.lineWidth=.75;ctx.beginPath();ctx.moveTo(x+p+left+2,frontY+row*rowHeight+rowHeight-2);ctx.lineTo(x+p+left+2,frontY+row*rowHeight+2);ctx.lineTo(x+p+right-2,frontY+row*rowHeight+2);ctx.stroke();
    }
  }
  ctx.beginPath();ctx.moveTo(x+p+cut,y+p);ctx.lineTo(x+T-p-cut,y+p);ctx.lineTo(x+T-p,frontY);ctx.lineTo(x+p,frontY);ctx.closePath();ctx.fillStyle=mix(base,.70,'#e6e9ec');ctx.fill();
  ctx.strokeStyle=mix(base,.4,'#ffffff');ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x+p+cut,y+p+1);ctx.lineTo(x+T-p-cut,y+p+1);ctx.stroke();
  if(high){ctx.strokeStyle=mix(base,.5,'#303944');ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x+T*.35,y+p+1);ctx.lineTo(x+T*.38,frontY);ctx.moveTo(x+T*.7,y+p+1);ctx.lineTo(x+T*.68,frontY);ctx.stroke();}
  // A small chipped corner adds texture without an emblem.
  ctx.fillStyle=mix(base,.55,'#242d37');ctx.beginPath();ctx.moveTo(x+T-p,y+T*.72);ctx.lineTo(x+T-p-T*.07,y+T*.77);ctx.lineTo(x+T-p,y+T*.81);ctx.fill();ctx.restore();
}
function drawGate(x,y,index){
  const {ctx,T,N,COL,THEME,mix,theme,environmentImages}=env;
  const X=x*T,Y=y*T,col=index===0?theme.terrain.gate.entry:index===4?theme.terrain.gate.exit:theme.terrain.gate.checkpoint;
  const image=environmentImages?.castleGate,definition=theme.terrain.images?.castleGate;
  if(image?.complete&&image.naturalWidth&&definition){
    const b=spriteBounds(image,definition,0),iw=image.naturalWidth,ih=image.naturalHeight;
    const sw=(b.right-b.left)*iw,sh=(b.bottom-b.top)*ih;
    const scale=Math.min(T*1.1/sw,T*1.35/sh),width=sw*scale,height=sh*scale;
    ctx.save();
    ctx.drawImage(image,b.left*iw,b.top*ih,sw,sh,X+T*.5-width/2,Y+T*.92-height,width,height);
    ctx.fillStyle=col;ctx.fillRect(X+T*.32,Y+T*.92,T*.36,T*.055);
    ctx.restore();return;
  }
  ctx.save();ctx.fillStyle='#24323940';ctx.fillRect(X+T*.16,Y+T*.20,T*.76,T*.76);
  // Minimal angular portal: beveled grey frame, dark passage, restrained accent.
  ctx.beginPath();ctx.moveTo(X+T*.12,Y+T*.88);ctx.lineTo(X+T*.12,Y+T*.26);ctx.lineTo(X+T*.28,Y+T*.10);ctx.lineTo(X+T*.72,Y+T*.10);ctx.lineTo(X+T*.88,Y+T*.26);ctx.lineTo(X+T*.88,Y+T*.88);ctx.closePath();ctx.fillStyle=theme.terrain.gate.frame;ctx.fill();ctx.strokeStyle=theme.terrain.gate.outline;ctx.lineWidth=2;ctx.stroke();
  ctx.beginPath();ctx.moveTo(X+T*.30,Y+T*.88);ctx.lineTo(X+T*.30,Y+T*.32);ctx.lineTo(X+T*.40,Y+T*.23);ctx.lineTo(X+T*.60,Y+T*.23);ctx.lineTo(X+T*.70,Y+T*.32);ctx.lineTo(X+T*.70,Y+T*.88);ctx.closePath();ctx.fillStyle=theme.terrain.gate.passage;ctx.fill();
  ctx.strokeStyle=theme.terrain.gate.highlight;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(X+T*.15,Y+T*.82);ctx.lineTo(X+T*.15,Y+T*.28);ctx.lineTo(X+T*.30,Y+T*.13);ctx.lineTo(X+T*.70,Y+T*.13);ctx.stroke();
  ctx.strokeStyle=col;ctx.lineWidth=Math.max(1.5,T*.055);ctx.beginPath();ctx.moveTo(X+T*.38,Y+T*.26);ctx.lineTo(X+T*.62,Y+T*.26);ctx.moveTo(X+T*.31,Y+T*.9);ctx.lineTo(X+T*.69,Y+T*.9);ctx.stroke();
  ctx.fillStyle='#f5f5e9';ctx.font=`600 ${Math.round(T*.32)}px 'IBM Plex Sans',sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(index,X+T*.5,Y+T*.59);ctx.restore();
}
function drawIsoWall(t){
  const {ctx,T,N,COL,THEME,mix,theme}=env;
  const p=T*.19,h=T*(t.obs? .52:.32),color=t.rock?mix(COL[t.rock.color].hex,.55,theme.terrain.wall.tintBase):theme.terrain.wall.base;
  const top=[[t.x*T+p,t.y*T+p],[(t.x+1)*T-p,t.y*T+p],[(t.x+1)*T-p,(t.y+1)*T-p],[t.x*T+p,(t.y+1)*T-p]];
  // A vertical screen displacement corresponds to equal negative world offsets.
  const face=(points,fill)=>{ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fillStyle=fill;ctx.fill();ctx.strokeStyle=theme.terrain.wall.outline;ctx.lineWidth=.9;ctx.stroke();};
  const raised=top.map(([x,y])=>[x-h,y-h]);
  face([raised[1],raised[2],top[2],top[1]],mix(color,.75,theme.terrain.wall.rightShade));
  face([raised[2],raised[3],top[3],top[2]],mix(color,.85,theme.terrain.wall.leftShade));
  face(raised,mix(color,.8,theme.terrain.wall.topLight));
  const rows=t.obs?3:2;
  const lerp=(a,b,q)=>[a[0]+(b[0]-a[0])*q,a[1]+(b[1]-a[1])*q];
  const inset=T*.014;
  for(const [a,b,shade] of [[1,2,theme.terrain.wall.rightShade],[2,3,theme.terrain.wall.leftShade]]){
    const point=(u,v)=>lerp(lerp(raised[a],raised[b],u),lerp(top[a],top[b],u),v);
    for(let row=0;row<rows;row++){
      const offset=row%2?.5:0;
      for(let col=-1;col<3;col++){
        const left=Math.max(0,(col+offset)/2),right=Math.min(1,(col+1+offset)/2);
        if(right<=left)continue;
        const u0=left+inset/T,u1=right-inset/T,v0=row/rows+.025,v1=(row+1)/rows-.025;
        const variation=((t.x*13+t.y*7+row*5+col+30)%7)*.025;
        face([point(u0,v0),point(u1,v0),point(u1,v1),point(u0,v1)],mix(color,.76+variation,shade));
        // Broad, irregular limestone flecks match the painted stone of the gate.
        for(let fleck=0;fleck<3;fleck++){
          const seed=((t.x*37+t.y*19+row*11+col*7+fleck*13+80)%23)/23;
          const u=u0+(u1-u0)*(.12+seed*.54),v=v0+(v1-v0)*(.15+fleck*.23);
          const du=(u1-u0)*.18,dv=(v1-v0)*.16;
          ctx.beginPath();[point(u,v),point(u+du,v-dv*.4),point(u+du*.8,v+dv),point(u-du*.3,v+dv*.7)].forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();
          ctx.fillStyle=mix(color,.68,fleck%2?shade:theme.terrain.wall.topLight);ctx.fill();
        }
        const start=point(u0,v0),end=point(u1,v0);
        ctx.strokeStyle=mix(color,.5,theme.terrain.wall.topLight);ctx.lineWidth=.65;ctx.beginPath();ctx.moveTo(...start);ctx.lineTo(...end);ctx.stroke();
      }
    }
  }
  // Capstones and short irregular fissures break up the smooth top face.
  ctx.strokeStyle=mix(color,.45,theme.terrain.wall.outline);ctx.lineWidth=.65;
  for(const q of [.33,.67]){
    const a=lerp(raised[0],raised[1],q),b=lerp(raised[3],raised[2],q);
    ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(a[0]+(b[0]-a[0])*.48+T*.035,a[1]+(b[1]-a[1])*.48);ctx.lineTo(...b);ctx.stroke();
  }
  const center=lerp(raised[0],raised[2],.5);
  for(let i=0;i<5;i++){
    const u=.15+i*.14,v=.25+((t.x*3+t.y*5+i*7)%5)*.1;
    const a=lerp(lerp(raised[0],raised[1],u),lerp(raised[3],raised[2],u),v);
    ctx.fillStyle=mix(color,.55,i%2?theme.terrain.wall.leftShade:theme.terrain.wall.topLight);
    ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(a[0]+T*.05,a[1]-T*.025);ctx.lineTo(a[0]+T*.085,a[1]+T*.045);ctx.lineTo(a[0]+T*.025,a[1]+T*.065);ctx.closePath();ctx.fill();
  }
  ctx.beginPath();ctx.moveTo(center[0]-T*.1,center[1]);ctx.lineTo(center[0]-T*.035,center[1]+T*.025);ctx.lineTo(center[0]+T*.05,center[1]-T*.045);ctx.stroke();
  if(t.obs){
    const ridgeA=lerp(raised[0],raised[3],.5),ridgeB=lerp(raised[1],raised[2],.5);
    ridgeA[0]-=T*.12;ridgeA[1]-=T*.12;ridgeB[0]-=T*.12;ridgeB[1]-=T*.12;
    face([raised[0],raised[1],ridgeB,ridgeA],'#6b6256');
    face([ridgeA,ridgeB,raised[2],raised[3]],'#968772');
    for(const q of [.25,.5,.75]){
      const a=lerp(raised[0],raised[1],q),b=lerp(ridgeA,ridgeB,q),c=lerp(raised[3],raised[2],q);
      ctx.strokeStyle='#4c4439';ctx.lineWidth=.55;ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.lineTo(...c);ctx.stroke();
    }
  }
}
function drawPlinth(x,y,width,height,color){
  const {ctx,T,N,COL,THEME,mix,theme}=env;
  const dx=-height*.12,dy=-height*.35,h=width/2;
  ctx.fillStyle='#20302e40';ctx.fillRect(x-h+T*.08,y-h+T*.10,width,width);
  ctx.fillStyle=mix(color,.23,'#46505c');ctx.beginPath();ctx.moveTo(x-h,y+h);ctx.lineTo(x+h,y+h);ctx.lineTo(x+h+dx,y+h+dy);ctx.lineTo(x-h+dx,y+h+dy);ctx.closePath();ctx.fill();ctx.strokeStyle='#29343e';ctx.lineWidth=1.2;ctx.stroke();
  ctx.fillStyle=mix(color,.13,'#26323e');ctx.beginPath();ctx.moveTo(x+h,y-h);ctx.lineTo(x+h,y+h);ctx.lineTo(x+h+dx,y+h+dy);ctx.lineTo(x+h+dx,y-h+dy);ctx.closePath();ctx.fill();ctx.stroke();
  return {x:x+dx,y:y+dy};
}
return {drawFloor,drawEnvironment,drawMapBoundary,drawPlayableGround,drawFeatureFootprint,drawNaturalFeature,drawWall,drawGate,drawIsoWall,drawPlinth};
});
