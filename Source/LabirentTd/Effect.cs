namespace LabirentTd;

public sealed record Effect(string K, double X1 = 0.0, double Y1 = 0.0, double X2 = 0.0, double Y2 = 0.0, string? C = null, double W = 0.0, double X = 0.0, double Y = 0.0, double R = 0.0)
{
	public int Id { get; set; }

	public int? SourceId { get; init; }

	public double T { get; set; }
}
