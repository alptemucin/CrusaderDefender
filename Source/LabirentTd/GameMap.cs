using System;
using System.Linq;

namespace LabirentTd;

public sealed class GameMap
{
	public Tile[][] Grid { get; } = (from y in Enumerable.Range(0, GameRules.Size)
		select (from x in Enumerable.Range(0, GameRules.Size)
			select new Tile(x, y)).ToArray()).ToArray();

	public int[][] Cps { get; set; } = Array.Empty<int[]>();
    public System.Collections.Generic.List<TerrainFeature> Features { get; } = new();
}
