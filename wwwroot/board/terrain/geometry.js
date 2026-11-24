'use strict';
window.CrusaderBoardGeometry={
  octagonPoints(x,y,size,inset=0){
    const left=x+inset,top=y+inset,right=x+size-inset,bottom=y+size-inset,cut=(size-inset*2)*.22;
    return [[left+cut,top],[right-cut,top],[right,top+cut],[right,bottom-cut],[right-cut,bottom],[left+cut,bottom],[left,bottom-cut],[left,top+cut]];
  },
  octagonPath(ctx,x,y,size,inset=0){
    ctx.beginPath();this.octagonPoints(x,y,size,inset).forEach(([px,py],i)=>i?ctx.lineTo(px,py):ctx.moveTo(px,py));ctx.closePath();
  },
  borderDistance(x,y,n){return Math.max(0,-x,-y,x-(n-1),y-(n-1));},
  rectsTouch(a,b){return a.left<=b.right&&a.right>=b.left&&a.top<=b.bottom&&a.bottom>=b.top;},
  rectTouchesPolygon(rect,polygon){
    const corners=[[rect.left,rect.top],[rect.right,rect.top],[rect.right,rect.bottom],[rect.left,rect.bottom]];
    const axes=[[1,0],[0,1],...polygon.map(([x,y],i)=>{const [nx,ny]=polygon[(i+1)%polygon.length];return [-(ny-y),nx-x];})];
    for(const [ax,ay] of axes){
      const p=polygon.map(([x,y])=>x*ax+y*ay),r=corners.map(([x,y])=>x*ax+y*ay);
      if(Math.max(...p)<Math.min(...r)-1e-7||Math.max(...r)<Math.min(...p)-1e-7)return false;
    }
    return true;
  },
  filterEnvironment(items,mapPolygon){
    const trees=items.filter(item=>item.node.kind==='trees'&&!this.rectTouchesPolygon(item.bounds,mapPolygon));
    const mountains=[];
    for(const item of items.filter(item=>item.node.kind==='mountains')){
      if(this.rectTouchesPolygon(item.bounds,mapPolygon))continue;
      if([...trees,...mountains].some(other=>this.rectsTouch(item.bounds,other.bounds)))continue;
      mountains.push(item);
    }
    return [...mountains,...trees].sort((a,b)=>a.node.depth-b.node.depth);
  },
  environmentNodes(n){
    const nodes=[];
    for(let y=-10;y<n+10;y++)for(let x=-10;x<n+10;x++){
      const distance=this.borderDistance(x,y,n);
      const seed=((x*73856093)^(y*19349663))>>>0;
      if(distance>=2&&distance<=5&&seed%100<78)nodes.push({x:x+.5,y:y+.5,kind:'trees',variant:seed%4,size:1,depth:x+y});
      if(distance>=7&&distance<=10&&seed%100<88)nodes.push({x:x+.5,y:y+.5,kind:'mountains',variant:seed%4,size:1,depth:x+y});
    }
    return nodes.sort((a,b)=>a.kind===b.kind?a.depth-b.depth:a.kind==='mountains'?-1:1);
  }
};
