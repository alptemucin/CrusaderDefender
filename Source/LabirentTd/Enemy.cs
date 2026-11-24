using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace LabirentTd;

public sealed class Enemy
{
	public int Id { get; init; }

	public double Hp { get; set; }

	public double Max { get; init; }

	public double Armor { get; init; }

	public double Mr { get; init; }

	public double Speed { get; init; }

	public bool Jump { get; init; }

	public string Shape { get; init; } = "c";

	public int Leak { get; init; }

	[JsonIgnore]
	public List<int[]> Path { get; init; } = new List<int[]>();

	public int I { get; set; }

	public double F { get; set; }

	public double X { get; set; }

	public double Y { get; set; }

	public double Slow { get; set; }

	public double SlowT { get; set; }

	public double Shred { get; set; }

	public double ShredT { get; set; }

	public bool Alive { get; set; } = true;

	public double Hop { get; set; }
}
