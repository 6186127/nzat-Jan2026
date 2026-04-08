using System.Threading;

namespace Workshop.Api.Services;

public static class RequestDbQueryCounter
{
    private sealed class CounterState
    {
        public int QueryCount;
    }

    private static readonly AsyncLocal<CounterState?> CurrentState = new();

    public static void BeginRequest()
    {
        CurrentState.Value = new CounterState();
    }

    public static int EndRequest()
    {
        var count = CurrentState.Value?.QueryCount ?? 0;
        CurrentState.Value = null;
        return count;
    }

    public static void Increment()
    {
        if (CurrentState.Value is { } state)
        {
            state.QueryCount += 1;
        }
    }

    public static int CurrentCount => CurrentState.Value?.QueryCount ?? 0;
}
