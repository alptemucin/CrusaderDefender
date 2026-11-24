using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;

namespace LabirentTd;

public sealed class GameEngine
{
	private readonly Random random;

	private int uid = 1;

	private int enemyId = 1;

	private int effectId = 1;

	private string? pickRecipe;

	private List<Unit>? pickCandidates;

	private double spawnT;

	public Guid RunId { get; private set; } = Guid.NewGuid();

	public GameMap Map { get; private set; }

	public long Revision { get; private set; }

	public int Turn { get; private set; } = 1;

	public int Lives { get; private set; } = 20;

	public string Phase { get; private set; } = "place";

	public string Tool { get; private set; } = "soul";

	public string? Step { get; private set; }

	public string? Over { get; private set; }

	public int Speed { get; private set; } = 1;

	public int SpawnLeft { get; private set; }

	public List<Unit> Pending { get; private set; } = new List<Unit>();

	public List<Enemy> Enemies { get; private set; } = new List<Enemy>();

	public List<Effect> Fx { get; } = new List<Effect>();

	public List<int[]> Path { get; private set; } = new List<int[]>();

	public List<int[]> Jpath { get; private set; } = new List<int[]>();

	public Wave Wave => GameRules.Waves[Turn - 1];

	public GameEngine(Random? random = null, GameMap? map = null)
	{
		this.random = random ?? new Random();
		Map = map ?? MapGenerator.Generate(this.random);
		ComputePaths();
	}

	public List<Unit> Units()
	{
		return (from t in Map.Grid.SelectMany((Tile[] row) => row)
			where t.Unit != null
			select t.Unit).ToList();
	}

	private List<Unit> Attackers()
	{
		return (from u in Units()
			where u.Kind == "tower" || (u.Revealed && !Pending.Contains(u))
			select u).ToList();
	}

	private void ComputePaths()
	{
		Path = MapGenerator.FullPath(Map, jump: false) ?? throw new InvalidOperationException("Normal yol bulunamadı.");
		Jpath = MapGenerator.FullPath(Map, jump: true) ?? throw new InvalidOperationException("Zıplayan yol bulunamadı.");
	}

	private static void Require(bool valid, string message)
	{
		if (!valid)
		{
			throw new RuleViolation(message);
		}
	}

	public void Apply(GameCommand command)
	{
		Require(command.Revision == Revision, "Oyun durumu değişti. Hamleyi tekrar dene.");
		bool flag = pickCandidates == null;
		bool flag2 = flag;
		if (!flag2)
		{
			bool flag3;
			switch (command.Action)
			{
			case "pick":
			case "cancelPick":
			case "new":
			case "again":
			case "speed":
				flag3 = true;
				break;
			default:
				flag3 = false;
				break;
			}
			flag2 = flag3;
		}
		Require(flag2, "Önce parlayan karolardan birini seç veya vazgeç.");
		switch (command.Action)
		{
		case "new":
			Reset(keepMap: false);
			break;
		case "again":
			Reset(keepMap: true);
			break;
		case "speed":
		{
			bool flag3;
			switch (command.Speed)
			{
			case 1:
			case 2:
			case 4:
				flag3 = true;
				break;
			default:
				flag3 = false;
				break;
			}
			Require(flag3, "Hız 1, 2 veya 4 olmalı.");
			Speed = command.Speed.Value;
			break;
		}
		case "tool":
		{
			string phase = Phase;
			bool flag3 = ((phase == "place" || phase == "ready") ? true : false);
			Require(flag3, "Bu aşamada araç değiştirilemez.");
			phase = command.Tool;
			flag3 = ((phase == "soul" || phase == "remove") ? true : false);
			Require(flag3, "Geçersiz araç.");
			Tool = command.Tool;
			break;
		}
		case "tile":
			ClickTile(command.X, command.Y);
			break;
		case "keep":
			Keep(FindPending(command.Id));
			break;
		case "rock":
			MarkRock(FindPending(command.Id));
			break;
		case "merge":
		{
			string phase = Phase;
			bool flag3 = ((phase == "place" || phase == "choose") ? true : false);
			Require(flag3, "Birleştirme savunma hazır olmadan önce yapılabilir.");
			List<Unit[]> list = MergePairs();
			int? index = command.Index;
			Require(index.HasValue && index.GetValueOrDefault() >= 0 && command.Index < list.Count, "Birleşecek eş bulunamadı.");
			pickCandidates = list[command.Index.Value].ToList();
			pickRecipe = null;
			break;
		}
		case "craft":
		{
			string phase = Phase;
			bool flag3 = ((phase == "place" || phase == "ready") ? true : false);
			Require(flag3 || (Phase == "choose" && Step == "keep"), "Şimdi kule kurulamaz.");
			Require(command.Recipe != null && GameRules.Towers.ContainsKey(command.Recipe), "Geçersiz tarif.");
			pickCandidates = Ingredients(GameRules.Towers[command.Recipe]);
			Require(pickCandidates != null, "Tarif için gereken ruhlar yok.");
			pickRecipe = command.Recipe;
			break;
		}
		case "pick":
			Pick(command.Id);
			break;
		case "cancelPick":
			pickCandidates = null;
			pickRecipe = null;
			break;
		case "start":
			StartWave();
			break;
		default:
			throw new RuleViolation("Geçersiz hamle.");
		}
		Revision++;
	}

	private void Reset(bool keepMap)
	{
		if (!keepMap)
		{
			Map = MapGenerator.Generate(random);
		}
		else
		{
			foreach (Tile item in Map.Grid.SelectMany((Tile[] row) => row))
			{
				item.Unit = null;
				item.Rock = null;
			}
		}
		RunId = Guid.NewGuid();
		Turn = 1;
		Lives = 20;
		Phase = "place";
		Tool = "soul";
		Step = null;
		Over = null;
		Pending = new List<Unit>();
		Enemies = new List<Enemy>();
		Fx.Clear();
		SpawnLeft = 0;
		spawnT = 0.0;
		pickCandidates = null;
		pickRecipe = null;
		ComputePaths();
	}

	private Unit FindPending(int? id)
	{
		Unit unit = Pending.Find((Unit u) => u.Id == id);
		Require(unit != null && unit.Status == null, "Ruh seçilemiyor.");
		return unit;
	}

	private void ClickTile(int? x, int? y)
	{
		Require(x.HasValue && y.HasValue && x.Value >= 0 && y.Value >= 0 && x.Value < GameRules.Size && y.Value < GameRules.Size, "Karo haritanın dışında.");
		Require(Over == null, "Oyun bitti.");
		Tile tile = Map.Grid[y.Value][x.Value];
		bool flag = Tool == "remove";
		bool flag2 = flag;
		if (flag2)
		{
			string phase = Phase;
			bool flag3 = ((phase == "place" || phase == "ready") ? true : false);
			flag2 = flag3;
		}
		if (flag2)
		{
			Require(!tile.Immutable && (object)tile.Rock != null && tile.Unit == null, "Kaldırılabilecek duvar yok.");
			tile.Rock = null;
			ComputePaths();
			return;
		}
		if (Phase == "place")
		{
			if (tile.Unit != null && Pending.Contains(tile.Unit))
			{
				Pending.Remove(tile.Unit);
				tile.Unit = null;
				ComputePaths();
			}
			else
			{
				Place(tile);
			}
			return;
		}
		if (Phase == "choose")
		{
			Unit unit = FindPending(tile.Unit?.Id);
			if (Step == "keep")
			{
				Keep(unit);
			}
			else
			{
				MarkRock(unit);
			}
			return;
		}
		throw new RuleViolation("Bu aşamada karo değiştirilemez.");
	}

	private void Place(Tile tile)
	{
		Require(!tile.Immutable && tile.Cp < 0 && tile.Unit == null, "Bu karoya ruh konamaz.");
		Unit item = (tile.Unit = new Unit
		{
			Id = uid++,
			X = tile.X,
			Y = tile.Y
		});
		if (MapGenerator.FullPath(Map, jump: false) == null)
		{
			tile.Unit = null;
			throw new RuleViolation("Bu karo yolu kapatır.");
		}
		Pending.Add(item);
		ComputePaths();
		if (Pending.Count != 5)
		{
			return;
		}
		string[] array = GameRules.Colors.Keys.ToArray();
		foreach (Unit item2 in Pending)
		{
			item2.Color = array[random.Next(array.Length)];
			item2.Lvl = ((!(random.NextDouble() < 0.2)) ? 1 : 2);
			item2.Revealed = true;
		}
		Phase = "choose";
		Step = "keep";
		Tool = "soul";
	}

	private void ToRock(Unit unit)
	{
		Tile tile = Map.Grid[unit.Y][unit.X];
		tile.Rock = new Rock(unit.Color, (object)tile.Rock != null);
		tile.Unit = null;
	}

	private void Keep(Unit unit)
	{
		Require(Phase == "choose" && Step == "keep", "Ruh tutma aşamasında değilsin.");
		unit.Status = "kept";
		AfterKeep();
	}

	private void AfterKeep()
	{
		if (Pending.Count((Unit u) => u.Status == "rock") >= 2)
		{
			FinalizeBuild();
		}
		else
		{
			Step = "rock";
		}
	}

	private void MarkRock(Unit unit)
	{
		Require(Phase == "choose" && Step == "rock", "Duvar seçme aşamasında değilsin.");
		unit.Status = "rock";
		ToRock(unit);
		if (Pending.Count((Unit u) => u.Status == "rock") >= 2)
		{
			FinalizeBuild();
		}
	}

	private void FinalizeBuild()
	{
		foreach (Unit item in Pending.Where((Unit u) => u.Status == null))
		{
			Map.Grid[item.Y][item.X].Unit = null;
		}
		Pending = new List<Unit>();
		Phase = "ready";
		Step = null;
		ComputePaths();
	}

	public List<Unit[]> MergePairs()
	{
		string phase = Phase;
		if ((!(phase == "place") && !(phase == "choose")) || 1 == 0)
		{
			return new List<Unit[]>();
		}
		List<Unit> list = (from u in Units()
			where u.Revealed && u.Status != "rock"
			select u).ToList();
		List<Unit[]> list2 = new List<Unit[]>();
		for (int num = 0; num < list.Count; num++)
		{
			for (int num2 = num + 1; num2 < list.Count; num2++)
			{
				Unit a = list[num];
				Unit unit = list[num2];
				if (a.Kind == unit.Kind && a.Type == unit.Type && a.Color == unit.Color && a.Lvl == unit.Lvl && a.Lvl < GameRules.Levels.Length - 1 && !list2.Any((Unit[] p) => p[0].Kind == a.Kind && p[0].Type == a.Type && p[0].Color == a.Color && p[0].Lvl == a.Lvl))
				{
					list2.Add(new Unit[2] { a, unit });
				}
			}
		}
		return list2;
	}

	private List<Unit>? Ingredients(TowerRule recipe)
	{
		bool inChoose = Phase == "choose";
		List<Unit> source = (from u in Units()
			where u.Kind == "soul" && u.Revealed && (!Pending.Contains(u) || (inChoose && u.Status == null))
			select u).ToList();
		List<Unit> list = new List<Unit>();
		string[] need = recipe.Need;
		foreach (string color in need)
		{
			Unit unit = (from u in source
				where u.Color == color
				orderby Pending.Contains(u) descending, u.Lvl
				select u).FirstOrDefault();
			if (unit == null)
			{
				return null;
			}
			list.Add(unit);
		}
		return (inChoose && !list.Any(Pending.Contains)) ? null : list;
	}

	private void Pick(int? id)
	{
		Require(pickCandidates != null, "Karo seçimi beklenmiyor.");
		Unit unit = pickCandidates.Find((Unit u) => u.Id == id);
		Require(unit != null, "Parlayan karolardan birini seç.");
		Unit k = unit;
		if (pickRecipe == null)
		{
			Unit unit2 = pickCandidates.Single((Unit u) => u != k);
			bool flag = Pending.Contains(k) || Pending.Contains(unit2);
			k.Lvl++;
			k.Status = "kept";
			unit2.Status = "rock";
			ToRock(unit2);
			if ((Phase == "choose") & flag)
			{
				if (Step == "keep")
				{
					AfterKeep();
				}
				else if (Pending.Count((Unit u) => u.Status == "rock") >= 2)
				{
					FinalizeBuild();
				}
				else
				{
					ComputePaths();
				}
			}
			else
			{
				ComputePaths();
			}
		}
		else
		{
			TowerRule towerRule = GameRules.Towers[pickRecipe];
			foreach (Unit item in pickCandidates.Where((Unit u) => u != k))
			{
				if (Pending.Contains(item))
				{
					item.Status = "rock";
				}
				ToRock(item);
			}
			Unit unit3 = new Unit
			{
				Id = uid++,
				Kind = "tower",
				Type = pickRecipe,
				Color = towerRule.Root,
				Lvl = pickCandidates.Min((Unit u) => u.Lvl),
				X = k.X,
				Y = k.Y,
				Revealed = true,
				DmgThis = k.DmgThis,
				DmgLast = k.DmgLast
			};
			int num = Pending.IndexOf(k);
			if (num >= 0)
			{
				unit3.Status = "kept";
				Pending[num] = unit3;
			}
			Map.Grid[k.Y][k.X].Unit = unit3;
			if (Phase == "choose")
			{
				AfterKeep();
			}
			else
			{
				ComputePaths();
			}
		}
		pickCandidates = null;
		pickRecipe = null;
	}

	private static double Distance(double x1, double y1, double x2, double y2)
	{
		return Math.Sqrt(Math.Pow(x1 - x2, 2.0) + Math.Pow(y1 - y2, 2.0));
	}

	private void StartWave()
	{
		Require(Phase == "ready" && Over == null, "Dalga için inşayı tamamla.");
		ComputePaths();
		SpawnLeft = Wave.N;
		spawnT = 0.0;
		Phase = "wave";
		Tool = "soul";
		List<Unit> list = Attackers();
		foreach (Unit item in list)
		{
			item.DmgThis = 0.0;
			item.Buff = 0.0;
			item.Cd = random.NextDouble() * 0.4;
			item.BuffTargetId = null;
		}
		foreach (Unit green in list.Where((Unit u) => u.Kind == "soul" && u.Color == "G"))
		{
			Unit unit = (from u in list
				where u != green && (!(u.Kind == "soul") || !(u.Color == "G")) && Distance(u.X, u.Y, green.X, green.Y) <= 5.0
				orderby u.DmgLast descending, Distance(u.X, u.Y, green.X, green.Y)
				select u).FirstOrDefault();
			if (unit != null)
			{
				green.BuffTargetId = unit.Id;
				unit.Buff = Math.Max(unit.Buff, green.Stats.Support);
			}
		}
	}

	private void Spawn()
	{
		Wave wave = Wave;
		List<int[]> list = (wave.Jump ? Jpath : Path);
		Enemies.Add(new Enemy
		{
			Id = enemyId++,
			Hp = wave.Hp,
			Max = wave.Hp,
			Armor = wave.Armor,
			Mr = wave.Mr,
			Speed = wave.Speed,
			Jump = wave.Jump,
			Shape = wave.Shape,
			Leak = wave.Leak,
			Path = list,
			X = list[0][0],
			Y = list[0][1]
		});
	}

	private static void Damage(Enemy enemy, double damage, string type, Unit source)
	{
		double num = Math.Max(0.0, enemy.Armor - enemy.Shred);
		double num2 = ((type == "p") ? (damage / (1.0 + 0.06 * num)) : (damage * (1.0 - enemy.Mr)));
		source.DmgThis += Math.Min(num2, enemy.Hp);
		enemy.Hp -= num2;
		if (enemy.Hp <= 0.0)
		{
			enemy.Alive = false;
		}
	}

	private void Fire(Unit unit, double dt)
	{
		unit.Cd -= dt * (1.0 + unit.Buff);
		if (unit.Cd > 0.0)
		{
			return;
		}
		CombatStats stats = unit.Stats;
		List<Enemy> list = (from e in Enemies
			where e.Alive && Distance(e.X, e.Y, unit.X, unit.Y) <= stats.Range + 0.01 && TerrainRules.CanFire(Map, unit, e.X, e.Y)
			orderby (double)e.I + e.F descending
			select e).ToList();
		if (list.Count == 0)
		{
			unit.Cd = 0.0;
			return;
		}
		unit.Cd = stats.Cd;
		string hex = GameRules.Colors[unit.Color].Hex;
		foreach (Enemy target in list.Take((stats.Multi <= 0) ? 1 : stats.Multi))
		{
			AddEffect(new Effect("beam", unit.X, unit.Y, target.X, target.Y, hex, (unit.Kind == "tower") ? 3.0 : 1.6)
			{
				T = 0.35,
				SourceId = unit.Id
			});
			if (stats.Splash > 0.0)
			{
				foreach (Enemy item in Enemies.Where((Enemy e) => e.Alive && Distance(e.X, e.Y, target.X, target.Y) <= stats.Splash && TerrainRules.CanFire(Map, unit, e.X, e.Y)))
				{
					Damage(item, stats.Dmg, stats.Dt, unit);
				}
				AddEffect(new Effect("ring", 0.0, 0.0, 0.0, 0.0, hex, 0.0, target.X, target.Y, stats.Splash)
				{
					T = 0.45
				});
			}
			else
			{
				Damage(target, stats.Dmg, stats.Dt, unit);
			}
			if (stats.Slow > 0.0)
			{
				target.Slow = Math.Max(target.Slow, stats.Slow);
				target.SlowT = 1.5;
			}
			if (stats.Shred > 0.0)
			{
				target.Shred = Math.Min(target.Shred + stats.Shred, stats.Shred * 4.0);
				target.ShredT = 4.0;
			}
		}
	}

	private void AddEffect(Effect effect)
	{
		effect.Id = effectId++;
		Fx.Add(effect);
	}

	public void Advance(double realSeconds)
	{
		foreach (Effect item in Fx)
		{
			item.T -= realSeconds;
		}
		Fx.RemoveAll((Effect f) => f.T <= 0.0);
		if (!(Phase != "wave"))
		{
			double num = realSeconds * (double)Speed;
			while (num > 1E-06 && Phase == "wave")
			{
				double num2 = Math.Min(0.02, num);
				num -= num2;
				Simulate(num2);
			}
		}
	}

	private void Simulate(double dt)
	{
		if (SpawnLeft > 0)
		{
			spawnT -= dt;
			if (spawnT <= 0.0)
			{
				Spawn();
				SpawnLeft--;
				spawnT = ((Wave.N > 20) ? 0.45 : 0.75);
			}
		}
		foreach (Enemy enemy2 in Enemies)
		{
			if (!enemy2.Alive)
			{
				continue;
			}
			if (enemy2.SlowT > 0.0)
			{
				enemy2.SlowT -= dt;
				if (enemy2.SlowT <= 0.0)
				{
					enemy2.Slow = 0.0;
				}
			}
			if (enemy2.ShredT > 0.0)
			{
				enemy2.ShredT -= dt;
				if (enemy2.ShredT <= 0.0)
				{
					enemy2.Shred = 0.0;
				}
			}
			enemy2.F += enemy2.Speed * (1.0 - enemy2.Slow) * dt;
			while (enemy2.F >= 1.0)
			{
				enemy2.I++;
				enemy2.F--;
			}
			if (enemy2.I >= enemy2.Path.Count - 1)
			{
				enemy2.Alive = false;
				Lives -= enemy2.Leak;
				AddEffect(new Effect("leak")
				{
					T = 0.4
				});
				continue;
			}
			int[] array = enemy2.Path[enemy2.I];
			int[] array2 = enemy2.Path[enemy2.I + 1];
			enemy2.X = (double)array[0] + (double)(array2[0] - array[0]) * enemy2.F;
			enemy2.Y = (double)array[1] + (double)(array2[1] - array[1]) * enemy2.F;
			if (enemy2.Jump)
			{
				bool flag = (object)Map.Grid[array[1]][array[0]].Rock != null;
				bool flag2 = (object)Map.Grid[array2[1]][array2[0]].Rock != null;
				Enemy enemy = enemy2;
				double hop;
				if (flag & flag2)
				{
					hop = 1.0;
				}
				else if (flag)
				{
					hop = 1.0 - enemy2.F;
				}
				else
				{
					hop = (flag2 ? enemy2.F : 0.0);
				}
				enemy.Hop = hop;
			}
		}
		foreach (Unit item in Attackers())
		{
			Fire(item, dt);
		}
		Enemies.RemoveAll((Enemy e) => !e.Alive);
		if (Lives <= 0)
		{
			Lives = 0;
			Over = "lose";
			Phase = "over";
			Revision++;
		}
		else
		{
			if (SpawnLeft != 0 || Enemies.Count != 0)
			{
				return;
			}
			foreach (Unit item2 in Attackers())
			{
				item2.DmgLast = item2.DmgThis;
			}
			Turn++;
			if (Turn > GameRules.Waves.Length)
			{
				Turn = GameRules.Waves.Length;
				Over = "win";
				Phase = "over";
			}
			else
			{
				Phase = "place";
			}
			ComputePaths();
			Revision++;
		}
	}

	public object Snapshot()
	{
		return new
		{
			RunId = RunId,
			Revision = Revision,
			Map = Map,
			ServerTimeMs = (double)Stopwatch.GetTimestamp() * 1000.0 / (double)Stopwatch.Frequency,
			State = new
			{
				Turn = Turn,
				Lives = Lives,
				Phase = Phase,
				Tool = Tool,
				Step = Step,
				Over = Over,
				Speed = Speed,
				SpawnLeft = SpawnLeft,
				Pending = Pending,
				Enemies = Enemies,
				Fx = Fx,
				Path = Path,
				Jpath = Jpath,
				Wave = Wave,
				Pick = ((pickCandidates == null) ? null : new
				{
					Cands = pickCandidates,
					Label = ((pickRecipe == null) ? "Birleşen birlik hangi karoda kalsın?" : (GameRules.Towers[pickRecipe].Name + " hangi karoda kurulsun?"))
				}),
				Pairs = MergePairs(),
				Recipes = (from kv in GameRules.Towers
					where Ingredients(kv.Value) != null
					select new
					{
						Key = kv.Key,
						Over = Ingredients(kv.Value).Any((Unit u) => u.Lvl > 1)
					}).ToArray()
			},
			Rules = new
			{
				N = GameRules.Size,
				Range = 4,
				Colors = GameRules.Colors,
				Waves = GameRules.Waves,
				Towers = GameRules.Towers.ToDictionary((KeyValuePair<string, TowerRule> kv) => kv.Key, (KeyValuePair<string, TowerRule> kv) => new
				{
					kv.Value.Name,
					kv.Value.Need,
					kv.Value.Root,
					kv.Value.Role,
					kv.Value.Stats.Dmg,
					kv.Value.Stats.Cd,
					kv.Value.Stats.Dt,
					kv.Value.Stats.Range
				})
			}
		};
	}
}
