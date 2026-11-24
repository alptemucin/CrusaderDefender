namespace LabirentTd;

public record Wave(string Name, int N, double Hp, double Armor, double Mr, double Speed, bool Jump, string Shape)
{
	public int Leak => (!(Shape == "s") || !(Hp > 500.0)) ? 1 : 2;
}
