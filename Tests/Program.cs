using LabirentTd;
using System.Reflection;
static void Check(bool valid,string label){if(!valid)throw new Exception(label);}
static void Reject(Action action,string label){try{action();}catch(RuleViolation){return;}throw new Exception(label);}
int maps=0;
for(int seed=0;seed<80;seed++)
{
    var map=MapGenerator.Generate(new Random(seed));
    Check(map.Grid.Length==63&&map.Grid.All(r=>r.Length==63),"63x63 map");
    Check(map.Features.Count(f=>f.Kind=="mountain")==18,"Mountain count");
    Check(map.Features.Count(f=>f.Kind=="tree")==135,"Tree count");
    Check(map.Features.Count(f=>f.Kind=="gate")==5,"Five gate features");
    Check(map.Grid.SelectMany(r=>r).Count(t=>t.Terrain=="gate")==30,"Gates occupy thirty distinct cells");
    foreach(var gate in map.Features.Where(f=>f.Kind=="gate")){
        Check(gate.Width*gate.Depth==6,"Six-cell gate footprint");
        for(int y=gate.Y;y<gate.Y+gate.Depth;y++)for(int x=gate.X;x<gate.X+gate.Width;x++){
            Check(map.Grid[y][x].Immutable,"Gate footprint is immutable");
            Check(MapGenerator.Passable(map,x,y,false)==(x==gate.X+1),"Only center of gate is passable");
            Check(map.Grid[y][x].Height==(x==gate.X+1?0:2),"Gate passage and column heights");
        }
    }
    foreach(var f in map.Features.Where(f=>f.Kind=="mountain"))
    {
        Check(f.Width==5&&f.Depth==5,"Mountain footprint is exactly 5x5");
        for(int y=f.Y;y<f.Y+f.Depth;y++)for(int x=f.X;x<f.X+f.Width;x++)
            Check(map.Grid[y][x].Terrain=="mountain"&&map.Grid[y][x].Immutable,"Immutable mountain cells");
    }
    Check(map.Grid.SelectMany(r=>r).Where(t=>t.Terrain=="tree").All(t=>t.Height==3&&t.Immutable),"Tree height and immutability");
    foreach(bool jump in new[]{false,true})
    {
        var path=MapGenerator.FullPath(map,jump)??throw new Exception("Connected checkpoints");
        Check(path.Any(p=>map.Grid[p[1]][p[0]].Bridge),"Paths cross bridge");
        for(int i=0;i<path.Count;i++)
        {
            var p=path[i];Check(MapGenerator.Passable(map,p[0],p[1],jump),"Only passable cells in path");
            if(i>0)Check(Math.Abs(p[0]-path[i-1][0])+Math.Abs(p[1]-path[i-1][1])==1,"Contiguous path");
        }
    }
    var game=new GameEngine(new Random(seed),map);
    foreach(string terrain in new[]{"water","tree","mountain","gate"})
    {
        var tile=map.Grid.SelectMany(r=>r).First(t=>t.Terrain==terrain);
        Reject(()=>game.Apply(new GameCommand("tile",tile.X,tile.Y,Revision:game.Revision)),"No building on "+terrain);
    }
    var bridge=map.Grid.SelectMany(r=>r).First(t=>t.Bridge);
    Reject(()=>game.Apply(new GameCommand("tile",bridge.X,bridge.Y,Revision:game.Revision)),"No building on bridges");
    game.Apply(new GameCommand("tool",Tool:"remove",Revision:game.Revision));
    foreach(var tile in map.Grid.SelectMany(r=>r).Where(t=>t.Terrain is "tree" or "mountain").Take(10))
        Reject(()=>game.Apply(new GameCommand("tile",tile.X,tile.Y,Revision:game.Revision)),"No removing fixed terrain");
    var before=map.Features.ToArray();game.Apply(new GameCommand("again",Revision:game.Revision));
    Check(game.Map.Features.SequenceEqual(before),"Replay preserves terrain");
    maps++;
}
var open=new GameMap{Cps=new[]{new[]{0,0},new[]{62,0},new[]{62,62},new[]{0,62},new[]{0,0}}};
var tower=new Unit{Id=1,X=5,Y=5,Color="W",Lvl=1,Revealed=true};
open.Grid[5][5].Unit=tower;
Check(TerrainRules.CanFire(open,tower,8,5),"Open line of fire");
open.Grid[5][6].Rock=new Rock("R",false);
Check(!TerrainRules.CanFire(open,tower,8,5),"Equal height blocks ground tower");
open.Grid[5][5].Rock=new Rock("W",false);
Check(TerrainRules.TowerHeight(open,tower)==2&&TerrainRules.CanFire(open,tower,8,5),"Tower on player wall clears height 1");
open.Grid[5][6].Rock=null;open.Grid[5][6].Obs=true;
Check(!TerrainRules.CanFire(open,tower,8,5),"Equal height 2 default wall blocks elevated tower");
open.Grid[5][6].Obs=false;open.Grid[5][6].Terrain="tree";
Check(!TerrainRules.CanFire(open,tower,8,5),"Height 3 tree blocks elevated tower");
open.Grid[5][6].Terrain="mountain";
Check(!TerrainRules.CanFire(open,tower,8,5),"Mountain blocks firing");
open.Grid[5][6].Terrain="ground";open.Grid[5][6].Obs=true;
Check(!TerrainRules.CanFire(open,tower,7,7),"Corner supercover blocks diagonal shots");
open.Grid[5][6].Obs=false;
var engine=new GameEngine(new Random(3),open);
var enemy=new Enemy{Id=1,Hp=100,Max=100,X=8,Y=5};
engine.Enemies.Add(enemy);
var fire=typeof(GameEngine).GetMethod("Fire",BindingFlags.NonPublic|BindingFlags.Instance)!;
open.Grid[5][6].Obs=true;fire.Invoke(engine,new object[]{tower,.02});
Check(enemy.Hp==100&&engine.Fx.Count==0,"Blocked attack has no damage or projectile");
open.Grid[5][6].Obs=false;fire.Invoke(engine,new object[]{tower,.02});
Check(enemy.Hp<100&&engine.Fx.Count>0,"Clear attack deals damage and creates projectile");
Check(new Tile(0,0){Rock=new Rock("R",true)}.Height==1,"All player walls are height 1");
var placing=new GameEngine(new Random(4),new GameMap{Cps=open.Cps});
placing.Apply(new GameCommand("tile",60,40,Revision:placing.Revision));
Check(placing.Map.Grid[40][60].Unit!=null,"Coordinates beyond old map bounds");
Console.WriteLine($"PASS: {maps} generated 63x63 maps, 25-cell mountains, fixed trees, water/bridge paths, placement guards, height equality, elevated towers and real damage.");
