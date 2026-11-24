using System.Collections.Generic;

namespace LabirentTd;

public static class GameRules
{
	public const int Size = 63;

	public const double GreenRange = 5.0;

	public static readonly Dictionary<string, ColorRule> Colors = new Dictionary<string, ColorRule>
	{
		["R"] = new ColorRule("Kırmızı", "#ff5a4e", "Alan hasarı", "m"),
		["B"] = new ColorRule("Mavi", "#4ea8ff", "Yavaşlatma", "m"),
		["D"] = new ColorRule("Siyah-mor", "#9a6bff", "Zırh kırma", "m"),
		["W"] = new ColorRule("Beyaz", "#eef1f6", "Tek hedef", "p"),
		["P"] = new ColorRule("Mor-pembe", "#ff5fd2", "Çoklu atış", "p"),
		["G"] = new ColorRule("Yeşil", "#46d67c", "Hız desteği", "p")
	};

	public static readonly Dictionary<string, CombatStats> Souls = new Dictionary<string, CombatStats>
	{
		["R"] = new CombatStats(7.0, 1.2, "m", 4.0, 1.1),
		["B"] = new CombatStats(5.0, 1.0, "m", 4.0, 0.0, 0.25),
		["D"] = new CombatStats(5.0, 1.0, "m", 4.0, 0.0, 0.0, 2.0),
		["W"] = new CombatStats(15.0, 1.1, "p"),
		["P"] = new CombatStats(6.0, 1.0, "p", 4.0, 0.0, 0.0, 0.0, 3),
		["G"] = new CombatStats(3.0, 1.0, "p", 4.0, 0.0, 0.0, 0.0, 0, 0.1)
	};

	public static readonly double[] Levels = new double[7] { 0.0, 1.0, 2.4, 5.0, 10.0, 20.0, 40.0 };

	public static readonly Dictionary<string, TowerRule> Towers = new Dictionary<string, TowerRule>
	{
		["RBG"] = new TowerRule("Topçu Burcu · RBG", new string[3] { "R", "B", "G" }, "R", "Alan büyü hasarı", new CombatStats(32.0, 1.0, "m", 4.0, 1.6)),
		["WPD"] = new TowerRule("Okçu Burcu · WPD", new string[3] { "W", "P", "D" }, "W", "Tek hedef fiziksel, uzun menzil", new CombatStats(62.0, 0.9, "p", 5.5, 0.0, 0.0, 3.0))
	};

	public static readonly Wave[] Waves = new Wave[15]
	{
		new Wave("Haçlı piyadeleri", 10, 20.0, 0.0, 0.0, 2.2, Jump: false, "c"),
		new Wave("Öncü piyadeler", 10, 32.0, 0.0, 0.0, 2.2, Jump: false, "c"),
		new Wave("Hafif öncüler", 12, 36.0, 0.0, 0.0, 3.2, Jump: false, "c"),
		new Wave("Zırhlı şövalyeler", 10, 70.0, 8.0, 0.0, 2.0, Jump: false, "s"),
		new Wave("Sancak muhafızları", 10, 80.0, 0.0, 0.5, 2.2, Jump: false, "d"),
		new Wave("Haçlı bölüğü", 14, 100.0, 1.0, 0.0, 2.2, Jump: false, "c"),
		new Wave("Piyade alayı", 24, 60.0, 0.0, 0.0, 2.4, Jump: false, "c"),
		new Wave("Ağır şövalyeler", 12, 170.0, 12.0, 0.0, 2.0, Jump: false, "s"),
		new Wave("Seçkin sancaktarlar", 12, 190.0, 0.0, 0.55, 2.2, Jump: false, "d"),
		new Wave("Hızlı hücum birliği", 16, 160.0, 2.0, 0.0, 3.2, Jump: false, "c"),
		new Wave("Kuşatma arabaları", 6, 650.0, 6.0, 0.25, 1.5, Jump: false, "s"),
		new Wave("Haçlı keşifçileri", 14, 230.0, 2.0, 0.1, 2.3, Jump: true, "t"),
		new Wave("Şövalye muhafızları", 14, 320.0, 15.0, 0.0, 2.0, Jump: false, "s"),
		new Wave("Seçkin keşifçileri", 14, 340.0, 0.0, 0.45, 2.3, Jump: true, "t"),
		new Wave("Büyük kuşatma", 10, 950.0, 10.0, 0.3, 1.6, Jump: false, "s")
	};

	public static CombatStats Stats(Unit u)
	{
		if (!u.Revealed)
		{
			return new CombatStats(0.0, 0.0, "p");
		}
		CombatStats combatStats = ((u.Kind == "tower") ? Towers[u.Type].Stats : Souls[u.Color]);
		return combatStats with
		{
			Dmg = combatStats.Dmg * Levels[u.Lvl],
			Slow = ((combatStats.Slow > 0.0) ? (combatStats.Slow + 0.05 * (double)(u.Lvl - 1)) : 0.0),
			Shred = combatStats.Shred * (double)u.Lvl,
			Multi = ((combatStats.Multi > 0) ? (combatStats.Multi + u.Lvl - 1) : 0),
			Support = combatStats.Support * (double)u.Lvl
		};
	}
}
