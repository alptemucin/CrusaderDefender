using System;

namespace LabirentTd;

public sealed class RuleViolation : Exception
{
	public RuleViolation(string message)
		: base(message)
	{
	}
}
