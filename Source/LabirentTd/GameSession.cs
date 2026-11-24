using System;

namespace LabirentTd;

internal sealed class GameSession
{
	public object Gate { get; } = new object();

	public GameEngine Game { get; } = new GameEngine();

	public DateTimeOffset LastAccess { get; set; } = DateTimeOffset.UtcNow;
}
