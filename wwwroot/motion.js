// Pure display interpolation. Never predicts combat or changes server state.
(function(root){
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const lerp=(a,b,t)=>a+(b-a)*t;
  function at(path,progress){
    const p=clamp(progress,0,path.length-1),i=Math.min(Math.floor(p),path.length-2),f=p-i;
    return {x:lerp(path[i][0],path[i+1][0],f),y:lerp(path[i][1],path[i+1][1],f)};
  }
  function facing(path,progress){
    const a=at(path,progress-.12),b=at(path,progress+.12);
    return Math.atan2(b.y-a.y,b.x-a.x);
  }
  class Buffer{
    constructor(){this.frames=[];}
    clear(){this.frames=[];}
    push(time,state){
      if(this.frames.length&&time<=this.frames.at(-1).time)return;
      this.frames.push({time,enemies:state.enemies,path:state.path,jpath:state.jpath});
      while(this.frames.length>2&&this.frames[1].time<time-1000)this.frames.shift();
    }
    view(time){
      if(!this.frames.length)return [];
      let a=this.frames[0],b=a;
      for(const f of this.frames){if(f.time<=time)a=f;if(f.time>=time){b=f;break;}b=f;}
      const t=a===b?0:clamp((time-a.time)/(b.time-a.time),0,1),next=new Map(b.enemies.map(e=>[e.id,e]));
      return a.enemies.map(old=>{
        const newer=next.get(old.id)||old,path=old.jump?a.jpath:a.path;
        const valid=Number.isFinite(old.i)&&Number.isFinite(newer.i)&&path?.length>1;
        const progress=valid?lerp(old.i+old.f,newer.i+newer.f,t):0;
        const pos=valid?at(path,progress):{x:lerp(old.x,newer.x,t),y:lerp(old.y,newer.y,t)};
        return {...old,...pos,hp:lerp(old.hp,newer.hp,t),hop:lerp(old.hop||0,newer.hop||0,t),
          renderProgress:progress,renderAngle:valid?facing(path,progress):0};
      });
    }
  }
  class Camera{
    constructor(){this.zoom=1;this.panX=0;this.panY=0;}
    matrix(width,height,world){
      const s=Math.min(width/(world*2),height/(world*1.28))*this.zoom;
      return {a:s,b:s*.5,c:-s,d:s*.5,e:width/2+this.panX,f:(height-s*world)/2+this.panY};
    }
    world(x,y,width,height,size){const m=this.matrix(width,height,size),det=m.a*m.d-m.b*m.c;
      return {x:((x-m.e)*m.d-(y-m.f)*m.c)/det,y:((y-m.f)*m.a-(x-m.e)*m.b)/det};}
    zoomAt(factor,x,y,width,height,size){
      const before=this.world(x,y,width,height,size);this.zoom=clamp(this.zoom*factor,.65,8);
      const m=this.matrix(width,height,size);this.panX+=x-(m.a*before.x+m.c*before.y+m.e);this.panY+=y-(m.b*before.x+m.d*before.y+m.f);
    }
    reset(){this.zoom=1;this.panX=0;this.panY=0;}
  }
  function archerFrame(dx,dy,age,cooldown,aiming){
    const sx=dx-dy,sy=(dx+dy)*.5;
    const column=sy<0?2:sx<0?1:0,flip=sy<0&&sx>0;
    const row=age>=0&&age<.18?3:age>=.18&&age<.32?0:!aiming?0:cooldown<.20?2:cooldown<.45?1:0;
    return {column,flip,row};
  }
  const api={Buffer,at,facing,Camera,archerFrame};
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.CrusaderMotion=api;
})(typeof window==='object'?window:this);
