'use strict';
CrusaderAssets.registerRenderer('enemies',env=>{
const layouts=new WeakMap();
function layoutOf(image,definition){
  if(layouts.has(image))return layouts.get(image);
  const cw=image.naturalWidth/definition.columns,ch=image.naturalHeight/definition.rows;
  const canvas=document.createElement('canvas');canvas.width=Math.ceil(cw);canvas.height=Math.ceil(ch);
  const c=canvas.getContext('2d',{willReadFrequently:true}),frames=[];
  for(let row=0;row<definition.rows;row++)for(let column=0;column<definition.columns;column++){
    c.clearRect(0,0,canvas.width,canvas.height);c.drawImage(image,column*cw,row*ch,cw,ch,0,0,canvas.width,canvas.height);
    const pixels=c.getImageData(0,0,canvas.width,canvas.height).data;
    let left=canvas.width,top=canvas.height,right=0,bottom=0;
    for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++)if(pixels[(y*canvas.width+x)*4+3]>=24){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x+1);bottom=Math.max(bottom,y+1);}
    if(right<=left){left=0;top=0;right=canvas.width;bottom=canvas.height;}
    frames.push({left:left*cw/canvas.width,top:top*ch/canvas.height,right:right*cw/canvas.width,bottom:bottom*ch/canvas.height});
  }
  const anchors=frames.slice(0,definition.columns).map(b=>(b.left+b.right)/2);
  const width=Math.max(...frames.map((b,i)=>2*Math.max(anchors[i%definition.columns]-b.left,b.right-anchors[i%definition.columns])));
  const height=Math.max(...frames.map(b=>b.bottom-b.top));
  const layout={cw,ch,frames,anchors,width,height};layouts.set(image,layout);return layout;
}
function drawEnemySprite(e,X,Y){
  const {ctx,T,COL,theme,enemyImages}=env;
  const key=e.max>500?'siegeWagon':e.shape==='s'?'knight':e.shape==='d'?'standardBearer':e.shape==='t'?'scout':'infantry';
  const image=enemyImages?.[key],definition=theme.enemies.images?.[key];
  if(!image?.complete||!image.naturalWidth||!definition)return false;
  const layout=layoutOf(image,definition),dx=Math.cos(e.renderAngle||0),dy=Math.sin(e.renderAngle||0);
  const sx=dx-dy,sy=(dx+dy)*.5,column=sy<0?(sx<0?2:3):(sx<0?1:0);
  // Distance drives the walk cycle, so paused or disconnected enemies stop moving.
  const row=((Math.floor((e.renderProgress||0)*4)+e.id)%definition.rows+definition.rows)%definition.rows;
  const b=layout.frames[row*definition.columns+column];
  const spriteHeight=key==='standardBearer'?1.15:key==='siegeWagon'?1.1:key==='knight'?.95:.85;
  const scale=.85*Math.min(T*spriteHeight/layout.height,T*(key==='siegeWagon'?1.15:.8)/layout.width);
  const baseline=T*.16;
  ctx.save();ctx.translate(X,Y);
  ctx.fillStyle='#080f0b66';ctx.beginPath();ctx.ellipse(0,baseline,T*.238,T*.0765,0,0,Math.PI*2);ctx.fill();
  ctx.drawImage(image,column*layout.cw,row*layout.ch,layout.cw,layout.ch,-layout.anchors[column]*scale,baseline-b.bottom*scale,layout.cw*scale,layout.ch*scale);
  for(const [enabled,color,radius] of [[e.slow,'#9fd0ff',.36],[e.shred,COL.D.hex,.42]])if(enabled){ctx.strokeStyle=color;ctx.lineWidth=1.2;ctx.beginPath();ctx.ellipse(0,baseline,T*radius,T*.12,0,0,Math.PI*2);ctx.stroke();}
  const hw=T*.6,healthY=baseline-layout.height*scale-T*.12;
  ctx.fillStyle='#422d23';ctx.fillRect(-hw/2,healthY,hw,T*.07);ctx.fillStyle='#da8a66';ctx.fillRect(-hw/2,healthY,hw*Math.max(0,Math.min(1,e.hp/e.max)),T*.07);
  ctx.restore();return true;
}
function drawCrusader(e,now){
  const {ctx,T,COL,theme}=env;
  const X=(e.x+.5)*T,Y=(e.y+.5)*T-e.hop*T*.3,giant=e.max>500;
  if(drawEnemySprite(e,X,Y))return;
  const phase=e.renderProgress*8+e.id,r=T*(giant ? .34 : .25),stride=Math.sin(phase)*r*.24;
  ctx.save();ctx.translate(X,Y);
  ctx.fillStyle='#080f0b66';ctx.beginPath();ctx.ellipse(0,r*.75+e.hop*T*.3,r*.95,r*.34,0,0,Math.PI*2);ctx.fill();
  ctx.save();ctx.rotate(e.renderAngle+Math.PI/2);ctx.translate(Math.sin(phase)*r*.035,-Math.abs(Math.sin(phase))*r*.10);
  if(giant){
    // Siege wagon instead of an implausibly oversized human.
    ctx.fillStyle=theme.enemies.appearance.wood;ctx.fillRect(-r,-r*.4,r*2,r*1.25);ctx.strokeStyle='#d3ba87';ctx.lineWidth=1;ctx.strokeRect(-r,-r*.4,r*2,r*1.25);
    ctx.strokeStyle='#3a2a20';ctx.beginPath();ctx.moveTo(-r,0);ctx.lineTo(r,0);ctx.moveTo(0,-r*.4);ctx.lineTo(0,r*.85);ctx.stroke();
    for(const x of [-r*.72,r*.72]){ctx.save();ctx.translate(x,r*.85);ctx.rotate(e.renderProgress*6);ctx.fillStyle='#24201b';ctx.beginPath();ctx.arc(0,0,r*.24,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#998362';ctx.stroke();ctx.beginPath();ctx.moveTo(-r*.22,0);ctx.lineTo(r*.22,0);ctx.moveTo(0,-r*.22);ctx.lineTo(0,r*.22);ctx.stroke();ctx.restore();}
  }
  ctx.fillStyle='#343d3e';ctx.fillRect(-r*.52,r*.23+stride,r*.33,r*.54);ctx.fillRect(r*.18,r*.23-stride,r*.33,r*.54);
  ctx.fillStyle=e.shape==='d'?theme.enemies.appearance.mysticCloth:e.shape==='t'?theme.enemies.appearance.scoutCloth:theme.enemies.appearance.cloth;ctx.strokeStyle='#303532';ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(-r*.52,-r*.38);ctx.lineTo(r*.52,-r*.38);ctx.lineTo(r*.7,r*.4);ctx.lineTo(-r*.7,r*.4);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillStyle=theme.enemies.appearance.cross;ctx.fillRect(-r*.09,-r*.23,r*.18,r*.52);ctx.fillRect(-r*.3,-r*.09,r*.6,r*.15);
  // Mail coif, iron helmet and a dark horizontal visor.
  ctx.fillStyle=e.shape==='s'?theme.enemies.appearance.heavyHelmet:theme.enemies.appearance.helmet;ctx.beginPath();ctx.arc(0,-r*.50,r*.42,Math.PI,0);ctx.lineTo(r*.42,-r*.16);ctx.lineTo(-r*.42,-r*.16);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillStyle='#28332f';ctx.fillRect(-r*.28,-r*.45,r*.56,r*.1);ctx.strokeStyle='#e0decb';ctx.beginPath();ctx.moveTo(0,-r*.88);ctx.lineTo(0,-r*.22);ctx.stroke();
  // Shield silhouette differentiates heavy, mystic and agile units.
  const sx=-r*.73,sy=r*.08;
  ctx.beginPath();ctx.moveTo(sx-r*.31,sy-r*.45);ctx.lineTo(sx+r*.31,sy-r*.45);ctx.lineTo(sx+r*.31,sy+r*.02);ctx.lineTo(sx,sy+r*.45);ctx.lineTo(sx-r*.31,sy+r*.02);ctx.closePath();
  ctx.fillStyle=e.shape==='s'?'#8d3030':e.shape==='d'?'#514267':'#e8dfc7';ctx.fill();ctx.strokeStyle='#bb9b65';ctx.stroke();
  ctx.fillStyle=e.shape==='s'?'#e8dfc7':'#a83830';ctx.fillRect(sx-r*.06,sy-r*.30,r*.12,r*.51);ctx.fillRect(sx-r*.2,sy-r*.15,r*.4,r*.12);
  ctx.strokeStyle='#c9c8b2';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(r*.72,r*.4);ctx.lineTo(r*.88,-r*.9);ctx.stroke();
  if(e.shape==='d'||giant){const flutter=Math.sin(now*7+e.id)*r*.17;ctx.fillStyle=e.shape==='d'?'#6b547b':'#a64034';ctx.beginPath();ctx.moveTo(r*.88,-r*.9);ctx.quadraticCurveTo(r*1.2,-r*.8+flutter,r*1.5,-r*.75+flutter);ctx.lineTo(r*.88,-r*.45);ctx.closePath();ctx.fill();}
  if(e.shape==='t'){ctx.strokeStyle='#c39153';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(r*.7,0,r*.48,-Math.PI/2,Math.PI/2);ctx.stroke();}
  if(e.slow){ctx.strokeStyle='#9fd0ff';ctx.lineWidth=1.6;ctx.beginPath();ctx.ellipse(0,0,r*1.25,r*1.15,0,0,Math.PI*2);ctx.stroke();}
  if(e.shred){ctx.strokeStyle=COL.D.hex;ctx.lineWidth=1.6;ctx.beginPath();ctx.ellipse(0,0,r*1.4,r*1.3,0,0,Math.PI*2);ctx.stroke();}
  ctx.restore();
  const hw=T*.65;ctx.fillStyle='#422d23';ctx.fillRect(-hw/2,-r-5,hw,3);ctx.fillStyle='#da8a66';ctx.fillRect(-hw/2,-r-5,hw*Math.max(0,e.hp/e.max),3);
  ctx.restore();
}
return {drawCrusader};
});
