namespace LabirentTd;

public sealed class Unit
{
	public int Id { get; init; }

	public string Kind { get; init; } = "soul";

	public string? Type { get; init; }

	public int X { get; init; }

	public int Y { get; init; }

	public string? Color { get; set; }

	public int Lvl { get; set; }

	public bool Revealed { get; set; }

	public string? Status { get; set; }

	public double Cd { get; set; }

	public double DmgThis { get; set; }

	public double DmgLast { get; set; }

	public double Buff { get; set; }

	public int? BuffTargetId { get; set; }

	public CombatStats Stats => GameRules.Stats(this);

	public double AttackInterval => Stats.Cd / (1.0 + Buff);

	public double PowerPerSecond => (AttackInterval > 0.0) ? (Stats.Dmg / AttackInterval) : 0.0;
}
