namespace LabirentTd;

public record GameCommand(string Action, int? X = null, int? Y = null, int? Id = null, int? Index = null, string? Recipe = null, string? Tool = null, int? Speed = null, long? Revision = null);
