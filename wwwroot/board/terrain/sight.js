'use strict';
window.CrusaderTerrainSight={
  height(tile){return tile?.height??(tile?.terrain==='tree'?3:tile?.terrain==='mountain'?4:tile?.obs?2:tile?.rock?1:0);},
  towerHeight(map,unit){return 1+(map.grid[unit.y][unit.x].rock?1:0);},
  canFire(map,unit,targetX,targetY){
    const height=this.towerHeight(map,unit),n=map.grid.length;
    const x0=unit.x+.5,y0=unit.y+.5,x1=targetX+.5,y1=targetY+.5;
    let x=Math.floor(x0),y=Math.floor(y0);const endX=Math.floor(x1),endY=Math.floor(y1),dx=x1-x0,dy=y1-y0;
    const sx=Math.sign(dx),sy=Math.sign(dy),deltaX=sx?Math.abs(1/dx):Infinity,deltaY=sy?Math.abs(1/dy):Infinity;
    let nextX=sx?(sx>0?x+1-x0:x0-x)/Math.abs(dx):Infinity,nextY=sy?(sy>0?y+1-y0:y0-y)/Math.abs(dy):Infinity;
    const blocked=(px,py)=>px<0||py<0||px>=n||py>=n||((px!==unit.x||py!==unit.y)&&this.height(map.grid[py][px])>=height);
    for(let guard=0;(x!==endX||y!==endY)&&guard<n*3;guard++){
      if(Math.abs(nextX-nextY)<1e-9){
        if(blocked(x+sx,y)||blocked(x,y+sy))return false;
        x+=sx;y+=sy;nextX+=deltaX;nextY+=deltaY;
      }else if(nextX<nextY){x+=sx;nextX+=deltaX;}else{y+=sy;nextY+=deltaY;}
      if(blocked(x,y))return false;
    }
    return true;
  }
};
