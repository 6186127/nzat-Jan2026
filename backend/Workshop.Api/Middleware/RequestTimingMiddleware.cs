using System.Diagnostics;
using Workshop.Api.Services;

namespace Workshop.Api.Middleware;

public sealed class RequestTimingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<RequestTimingMiddleware> _logger;

    public RequestTimingMiddleware(
        RequestDelegate next,
        ILogger<RequestTimingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var stopwatch = Stopwatch.StartNew();
        RequestDbQueryCounter.BeginRequest();

        context.Response.OnStarting(() =>
        {
            context.Response.Headers["X-Response-Time"] = $"{stopwatch.Elapsed.TotalMilliseconds:F0}ms";
            context.Response.Headers["X-Db-Query-Count"] = RequestDbQueryCounter.CurrentCount.ToString();
            return Task.CompletedTask;
        });

        try
        {
            await _next(context);
        }
        finally
        {
            stopwatch.Stop();
            var dbQueryCount = RequestDbQueryCounter.EndRequest();

            _logger.LogInformation(
                "HTTP {Method} {Path}{QueryString} responded {StatusCode} in {ElapsedMs} ms with {DbQueryCount} DB queries",
                context.Request.Method,
                context.Request.Path,
                context.Request.QueryString,
                context.Response.StatusCode,
                stopwatch.Elapsed.TotalMilliseconds,
                dbQueryCount);
        }
    }
}
