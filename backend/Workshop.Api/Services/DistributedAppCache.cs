using System.Text.Json;
using Microsoft.Extensions.Caching.Distributed;

namespace Workshop.Api.Services;

public class DistributedAppCache : IAppCache
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        PropertyNameCaseInsensitive = true
    };

    private readonly IDistributedCache _cache;
    private readonly ILogger<DistributedAppCache> _logger;

    public DistributedAppCache(IDistributedCache cache, ILogger<DistributedAppCache> logger)
    {
        _cache = cache;
        _logger = logger;
    }

    public Task<string?> GetStringAsync(string key, CancellationToken ct = default)
        => _cache.GetStringAsync(key, ct);

    public async Task<T?> GetOrCreateAsync<T>(
        string key,
        TimeSpan ttl,
        Func<CancellationToken, Task<T?>> factory,
        CancellationToken ct = default
    ) where T : class
    {
        var cached = await _cache.GetStringAsync(key, ct);
        if (!string.IsNullOrWhiteSpace(cached))
        {
            try
            {
                return JsonSerializer.Deserialize<T>(cached, JsonOptions);
            }
            catch (JsonException ex)
            {
                _logger.LogWarning(ex, "Failed to deserialize cache key {CacheKey}. Deleting corrupted entry.", key);
                await _cache.RemoveAsync(key, ct);
            }
        }

        var value = await factory(ct);
        if (value is null)
            return null;

        var payload = JsonSerializer.Serialize(value, JsonOptions);
        await _cache.SetStringAsync(
            key,
            payload,
            new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = ApplyJitter(ttl)
            },
            ct
        );

        return value;
    }

    public async Task<string?> GetOrCreateJsonAsync(
        string key,
        TimeSpan ttl,
        Func<CancellationToken, Task<string?>> factory,
        CancellationToken ct = default
    )
    {
        var cached = await _cache.GetStringAsync(key, ct);
        if (!string.IsNullOrWhiteSpace(cached))
            return cached;

        var payload = await factory(ct);
        if (string.IsNullOrWhiteSpace(payload))
            return null;

        await _cache.SetStringAsync(
            key,
            payload,
            new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = ApplyJitter(ttl)
            },
            ct
        );

        return payload;
    }

    public Task RemoveAsync(string key, CancellationToken ct = default)
        => _cache.RemoveAsync(key, ct);

    public Task SetStringAsync(string key, string value, TimeSpan ttl, CancellationToken ct = default)
        => _cache.SetStringAsync(
            key,
            value,
            new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = ApplyJitter(ttl)
            },
            ct
        );

    private static TimeSpan ApplyJitter(TimeSpan ttl)
    {
        if (ttl <= TimeSpan.FromSeconds(5))
            return ttl;

        var jitterRangeMs = ttl.TotalMilliseconds * 0.1d;
        var jitterMs = (Random.Shared.NextDouble() * jitterRangeMs * 2d) - jitterRangeMs;
        var adjusted = ttl + TimeSpan.FromMilliseconds(jitterMs);
        return adjusted > TimeSpan.FromSeconds(1) ? adjusted : TimeSpan.FromSeconds(1);
    }
}
