using System;
using System.Collections.Generic;
using System.Linq;
namespace LabirentTd;
public static class MapGenerator
{
    private const int N = GameRules.Size;
    private static readonly (int X, int Y)[] Directions = {(1,0),(-1,0),(0,1),(0,-1)};
    public static bool Passable(GameMap map, int x, int y, bool jump)
    {
        if(x<0 || y<0 || x>=N || y>=N)return false;
        var tile=map.Grid[y][x];
        return !tile.Obs && tile.Terrain is not ("tree" or "mountain") &&
            (tile.Terrain!="gate" || tile.GatePassage) &&
            (tile.Terrain!="water" || tile.Bridge) && tile.Unit==null &&
            (tile.Rock==null || (jump && !tile.Rock.Up));
    }
    public static List<int[]>? Bfs(GameMap map, int[] a, int[] b, bool jump)
    {
        var distances=Enumerable.Repeat(-1,N*N).ToArray();
        int start=a[1]*N+a[0],end=b[1]*N+b[0];
        var queue=new Queue<int>();distances[end]=0;queue.Enqueue(end);
        while(queue.Count>0)
        {
            int current=queue.Dequeue();if(current==start)break;
            foreach(var (dx,dy) in Directions)
            {
                int x=current%N+dx,y=current/N+dy;
                if(!Passable(map,x,y,jump))continue;
                int next=y*N+x;if(distances[next]>=0)continue;
                distances[next]=distances[current]+1;queue.Enqueue(next);
            }
        }
        if(distances[start]<0)return null;
        var path=new List<int[]> {new[]{a[0],a[1]}};
        int px=a[0],py=a[1];
        while(px!=b[0] || py!=b[1])
        {
            var next=Directions.Select(d=>(X:px+d.X,Y:py+d.Y))
                .Where(p=>p.X>=0&&p.Y>=0&&p.X<N&&p.Y<N&&distances[p.Y*N+p.X]==distances[py*N+px]-1)
                .OrderByDescending(p=>p.X!=px?Math.Abs(b[0]-px)-Math.Abs(b[1]-py):Math.Abs(b[1]-py)-Math.Abs(b[0]-px)).First();
            px=next.X;py=next.Y;path.Add(new[]{px,py});
        }
        return path;
    }
    public static List<int[]>? FullPath(GameMap map,bool jump)
    {
        var path=new List<int[]>();for(int i=0;i<map.Cps.Length-1;i++)
        {
            var leg=Bfs(map,map.Cps[i],map.Cps[i+1],jump);if(leg==null)return null;
            path.AddRange(i==0?leg:leg.Skip(1));
        }
        return path;
    }
    public static GameMap Generate(Random random)
    {
        for(int attempt=0;attempt<100;attempt++)
        {
            var map=new GameMap();int riverX=random.Next(24,37);
            for(int y=0;y<N;y++)for(int x=riverX;x<riverX+3;x++)map.Grid[y][x].Terrain="water";
            foreach(int y in new[]{random.Next(8,16),random.Next(27,36),random.Next(46,55)})
            {
                for(int x=riverX;x<riverX+3;x++)map.Grid[y][x].Bridge=true;
                map.Features.Add(new TerrainFeature("bridge",riverX,y,3,1,0));
            }
            for(int i=0;i<18;i++)PlaceFeature("mountain",5,5,4);
            for(int i=0;i<135;i++)PlaceFeature("tree",1,1,3);
            for(int i=0;i<100;i++)
            {
                int x=random.Next(2,N-6),y=random.Next(2,N-6),length=random.Next(2,6);
                bool horizontal=random.Next(2)==0;
                for(int j=0;j<length;j++)
                {
                    var tile=map.Grid[y+(horizontal?0:j)][x+(horizontal?j:0)];
                    if(tile.Terrain=="ground")tile.Obs=true;
                }
            }
            var cps=new List<int[]>();
            for(int i=0;i<5;i++)for(int trial=0;trial<200;trial++)
            {
                int x=i%2==0?random.Next(3,riverX-3):random.Next(riverX+6,N-3),y=random.Next(3,N-3);
                if(!Passable(map,x,y,false)||cps.Any(p=>Math.Max(Math.Abs(p[0]-x),Math.Abs(p[1]-y))<18))continue;
                if(Enumerable.Range(y-1,2).SelectMany(yy=>Enumerable.Range(x-1,3).Select(xx=>map.Grid[yy][xx])).Any(t=>t.Terrain!="ground"||t.Obs))continue;
                for(int yy=y-1;yy<=y;yy++)for(int xx=x-1;xx<=x+1;xx++){
                    map.Grid[yy][xx].Terrain="gate";map.Grid[yy][xx].GatePassage=xx==x;
                }
                map.Features.Add(new TerrainFeature("gate",x-1,y-1,3,2,2,i));
                cps.Add(new[]{x,y});break;
            }
            if(cps.Count!=5)continue;
            map.Cps=cps.ToArray();if(FullPath(map,false)==null||FullPath(map,true)==null)continue;
            for(int i=0;i<cps.Count;i++)map.Grid[cps[i][1]][cps[i][0]].Cp=i;
            return map;
            void PlaceFeature(string kind,int width,int depth,int height)
            {
                for(int trial=0;trial<100;trial++)
                {
                    int x=random.Next(2,N-width-2),y=random.Next(2,N-depth-2);
                    if(Enumerable.Range(y,depth).SelectMany(yy=>Enumerable.Range(x,width).Select(xx=>map.Grid[yy][xx])).Any(t=>t.Terrain!="ground"))continue;
                    for(int yy=y;yy<y+depth;yy++)for(int xx=x;xx<x+width;xx++)map.Grid[yy][xx].Terrain=kind;
                    map.Features.Add(new TerrainFeature(kind,x,y,width,depth,height,random.Next(4)));return;
                }
            }
        }
        throw new InvalidOperationException("Geçerli harita üretilemedi.");
    }
}
