namespace LabirentTd;

public sealed class Tile(int x, int y)
{
	public int X { get; } = x;

	public int Y { get; } = y;

	public bool Obs { get; set; }

	public Rock? Rock { get; set; }

	public Unit? Unit { get; set; }

	public int Cp { get; set; } = -1;
    public string Terrain { get; set; } = "ground";
    public bool Bridge { get; set; }
    public bool GatePassage { get; set; }
    public int Height => Terrain == "tree" ? 3 : Terrain == "mountain" ? 4 : Terrain == "gate" && !GatePassage ? 2 : Obs ? 2 : Rock != null ? 1 : 0;
    public bool Immutable => Terrain != "ground" || Obs;
}
