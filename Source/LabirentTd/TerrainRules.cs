using System;
using System.Collections.Generic;
namespace LabirentTd;
public static class TerrainRules
{
    public static int TowerHeight(GameMap map, Unit unit) => 1 + (map.Grid[unit.Y][unit.X].Rock != null ? 1 : 0);
    public static bool CanFire(GameMap map,Unit unit,double targetX,double targetY)
    {
        int height=TowerHeight(map,unit);
        foreach(var (x,y) in RayCells(unit.X+.5,unit.Y+.5,targetX+.5,targetY+.5))
        {
            if(x==unit.X && y==unit.Y)continue;
            if(x<0||y<0||x>=GameRules.Size||y>=GameRules.Size)return false;
            if(map.Grid[y][x].Height>=height)return false;
        }
        return true;
    }
    // Supercover traversal also checks both neighboring cells when crossing a corner.
    public static IEnumerable<(int X,int Y)> RayCells(double x0,double y0,double x1,double y1)
    {
        int x=(int)Math.Floor(x0),y=(int)Math.Floor(y0),endX=(int)Math.Floor(x1),endY=(int)Math.Floor(y1);
        yield return (x,y);
        double dx=x1-x0,dy=y1-y0;
        int sx=Math.Sign(dx),sy=Math.Sign(dy);
        double deltaX=sx==0?double.PositiveInfinity:Math.Abs(1/dx);
        double deltaY=sy==0?double.PositiveInfinity:Math.Abs(1/dy);
        double nextX=sx==0?double.PositiveInfinity:((sx>0?x+1-x0:x0-x)/Math.Abs(dx));
        double nextY=sy==0?double.PositiveInfinity:((sy>0?y+1-y0:y0-y)/Math.Abs(dy));
        int guard=0;
        while((x!=endX||y!=endY)&&guard++<GameRules.Size*3)
        {
            if(Math.Abs(nextX-nextY)<1e-9)
            {
                yield return (x+sx,y);yield return (x,y+sy);
                x+=sx;y+=sy;nextX+=deltaX;nextY+=deltaY;
            }
            else if(nextX<nextY){x+=sx;nextX+=deltaX;}
            else{y+=sy;nextY+=deltaY;}
            yield return (x,y);
        }
    }
}
