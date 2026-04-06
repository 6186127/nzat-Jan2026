namespace Workshop.Api.Services;

public interface IAppCache
{
    Task<string?> GetStringAsync(string key, CancellationToken ct = default);

    Task<T?> GetOrCreateAsync<T>(
        string key,
        TimeSpan ttl,
        Func<CancellationToken, Task<T?>> factory,
        CancellationToken ct = default
    ) where T : class;

    Task<string?> GetOrCreateJsonAsync(
        string key,
        TimeSpan ttl,
        Func<CancellationToken, Task<string?>> factory,
        CancellationToken ct = default
    );

    Task SetStringAsync(string key, string value, TimeSpan ttl, CancellationToken ct = default);

    Task RemoveAsync(string key, CancellationToken ct = default);
}
