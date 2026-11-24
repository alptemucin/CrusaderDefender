using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace LabirentTd;

internal sealed class GameSessions(ResultStore results, ILogger<GameSessions> logger) : BackgroundService
{
	private readonly ConcurrentDictionary<Guid, GameSession> sessions = new ConcurrentDictionary<Guid, GameSession>();

	private readonly ConcurrentDictionary<Guid, GameResultInput> pendingResults = new ConcurrentDictionary<Guid, GameResultInput>();

	private readonly object creationGate = new object();

	private readonly JsonSerializerOptions jsonOptions = new JsonSerializerOptions(JsonSerializerDefaults.Web);

	private const string Cookie = "labirent-session";

	public GameSession? Find(HttpContext context)
	{
		if (!Guid.TryParse(context.Request.Cookies["labirent-session"], out var result) || !sessions.TryGetValue(result, out GameSession value))
		{
			return null;
		}
		lock (value.Gate)
		{
			value.LastAccess = DateTimeOffset.UtcNow;
		}
		return value;
	}

	public GameSession GetOrCreate(HttpContext context)
	{
		GameSession gameSession = Find(context);
		if (gameSession != null)
		{
			return gameSession;
		}
		lock (creationGate)
		{
			if (sessions.Count >= 128)
			{
				throw new RuleViolation("Sunucu dolu. Daha sonra tekrar dene.");
			}
			GameSession gameSession2 = new GameSession();
			Guid key = Guid.NewGuid();
			sessions[key] = gameSession2;
			context.Response.Cookies.Append("labirent-session", key.ToString(), new CookieOptions
			{
				HttpOnly = true,
				SameSite = SameSiteMode.Strict,
				Secure = context.Request.IsHttps,
				IsEssential = true,
				MaxAge = TimeSpan.FromDays(1),
				Path = "/"
			});
			return gameSession2;
		}
	}

	public IResult Snapshot(GameSession session, GameCommand? command = null)
	{
		lock (session.Gate)
		{
			QueueResult(session.Game);
			if ((object)command != null)
			{
				session.Game.Apply(command);
			}
			session.LastAccess = DateTimeOffset.UtcNow;
			return Results.Bytes(JsonSerializer.SerializeToUtf8Bytes(session.Game.Snapshot(), jsonOptions), "application/json");
		}
	}

	private void QueueResult(GameEngine game)
	{
		if (game.Over != null)
		{
			pendingResults.TryAdd(game.RunId, new GameResultInput(game.RunId, game.Turn, game.Lives, game.Over));
		}
	}

	protected override async Task ExecuteAsync(CancellationToken stoppingToken)
	{
		using PeriodicTimer timer = new PeriodicTimer(TimeSpan.FromMilliseconds(50L));
		long last = Stopwatch.GetTimestamp();
		HashSet<Guid> saved = new HashSet<Guid>();
		while (await timer.WaitForNextTickAsync(stoppingToken))
		{
			long now = Stopwatch.GetTimestamp();
			double dt = Math.Min(0.25, Stopwatch.GetElapsedTime(last, now).TotalSeconds);
			last = now;
			Guid key;
			foreach (KeyValuePair<Guid, GameSession> session2 in sessions)
			{
				session2.Deconstruct(out key, out var value);
				Guid id = key;
				GameSession session = value;
				lock (session.Gate)
				{
					if (DateTimeOffset.UtcNow - session.LastAccess > TimeSpan.FromMinutes(30L))
					{
						QueueResult(session.Game);
						sessions.TryRemove(id, out value);
					}
					else
					{
						session.Game.Advance(dt);
						QueueResult(session.Game);
					}
				}
			}
			foreach (KeyValuePair<Guid, GameResultInput> pendingResult in pendingResults)
			{
				pendingResult.Deconstruct(out key, out var value2);
				Guid id2 = key;
				GameResultInput result = value2;
				if (!saved.Contains(id2))
				{
					try
					{
						await results.Add(result);
						saved.Add(id2);
					}
					catch (Exception ex)
					{
						Exception e = ex;
						logger.LogError(e, "Oyun sonucu kaydedilemedi: {RunId}", id2);
						continue;
					}
				}
				pendingResults.TryRemove(id2, out value2);
			}
			HashSet<Guid> active = sessions.Values.Select((GameSession s) =>
			{
				lock (s.Gate)
				{
					return s.Game.RunId;
				}
			}).ToHashSet();
			saved.IntersectWith(active);
		}
	}
}
