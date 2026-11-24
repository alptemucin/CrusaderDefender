using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;

internal sealed class ResultStore(IWebHostEnvironment environment, IConfiguration configuration)
{
	private readonly SemaphoreSlim gate = new SemaphoreSlim(1, 1);

	private readonly string path = Path.Combine(configuration["GameDataDirectory"] ?? Path.Combine(environment.ContentRootPath, "App_Data"), "results.json");

	private async Task<List<GameResult>> Load()
	{
		return (!File.Exists(path)) ? new List<GameResult>() : (JsonSerializer.Deserialize<List<GameResult>>(await File.ReadAllTextAsync(path)) ?? new List<GameResult>());
	}

	public async Task<List<GameResult>> Read()
	{
		await gate.WaitAsync();
		try
		{
			return (await Load()).OrderByDescending((GameResult r) => r.CreatedAt).Take(20).ToList();
		}
		finally
		{
			gate.Release();
		}
	}

	public async Task<GameResult> Add(GameResultInput input)
	{
		await gate.WaitAsync();
		try
		{
			List<GameResult> results = await Load();
			GameResult existing = results.Find((GameResult r) => r.Id == input.Id);
			if ((object)existing != null)
			{
				return existing;
			}
			GameResult result = new GameResult(input.Id, input.Turn, input.Lives, input.Outcome, DateTimeOffset.UtcNow);
			results.Insert(0, result);
			Directory.CreateDirectory(Path.GetDirectoryName(path));
			string temporary = path + ".tmp";
			await File.WriteAllTextAsync(temporary, JsonSerializer.Serialize(results.Take(1000)));
			File.Move(temporary, path, overwrite: true);
			return result;
		}
		finally
		{
			gate.Release();
		}
	}
}
