using System;

internal record GameResult(Guid Id, int Turn, int Lives, string Outcome, DateTimeOffset CreatedAt);
