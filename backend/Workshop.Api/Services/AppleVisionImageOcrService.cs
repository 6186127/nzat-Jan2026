using System.Diagnostics;
using Microsoft.Extensions.Options;
using Workshop.Api.Options;

namespace Workshop.Api.Services;

public sealed class AppleVisionImageOcrService
{
    private const string ScriptFileName = "vision-image-ocr.swift";

    private readonly IWebHostEnvironment _environment;
    private readonly ImageOcrOptions _options;
    private readonly ILogger<AppleVisionImageOcrService> _logger;
    private readonly SemaphoreSlim _scriptLock = new(1, 1);
    private string? _scriptPath;

    public AppleVisionImageOcrService(
        IWebHostEnvironment environment,
        IOptions<ImageOcrOptions> options,
        ILogger<AppleVisionImageOcrService> logger)
    {
        _environment = environment;
        _options = options.Value;
        _logger = logger;
    }

    public bool IsEnabled =>
        _options.Enabled &&
        OperatingSystem.IsMacOS() &&
        File.Exists("/usr/bin/swift");

    public async Task<string?> ExtractTextAsync(string imagePath, CancellationToken ct)
    {
        if (!IsEnabled || string.IsNullOrWhiteSpace(imagePath) || !File.Exists(imagePath))
            return null;

        var scriptPath = await EnsureScriptAsync(ct);
        if (string.IsNullOrWhiteSpace(scriptPath))
            return null;

        using var process = new Process();
        process.StartInfo = new ProcessStartInfo
        {
            FileName = "/usr/bin/swift",
            ArgumentList = { scriptPath, imagePath },
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true,
        };

        process.Start();

        var timeout = TimeSpan.FromSeconds(Math.Max(5, _options.TimeoutSeconds));
        using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(ct);
        linkedCts.CancelAfter(timeout);

        try
        {
            await process.WaitForExitAsync(linkedCts.Token);
        }
        catch (OperationCanceledException)
        {
            TryTerminate(process);
            _logger.LogWarning("Apple Vision OCR timed out for {ImagePath}", imagePath);
            return null;
        }

        var stdout = await process.StandardOutput.ReadToEndAsync(ct);
        var stderr = await process.StandardError.ReadToEndAsync(ct);
        if (process.ExitCode != 0)
        {
            _logger.LogWarning(
                "Apple Vision OCR failed for {ImagePath} with exit code {ExitCode}: {Error}",
                imagePath,
                process.ExitCode,
                stderr);
            return null;
        }

        var text = stdout.Trim();
        return string.IsNullOrWhiteSpace(text) ? null : text;
    }

    private async Task<string?> EnsureScriptAsync(CancellationToken ct)
    {
        if (!string.IsNullOrWhiteSpace(_scriptPath) && File.Exists(_scriptPath))
            return _scriptPath;

        await _scriptLock.WaitAsync(ct);
        try
        {
            if (!string.IsNullOrWhiteSpace(_scriptPath) && File.Exists(_scriptPath))
                return _scriptPath;

            var directory = Path.Combine(_environment.ContentRootPath, "App_Data", "ocr");
            Directory.CreateDirectory(directory);

            var path = Path.Combine(directory, ScriptFileName);
            if (!File.Exists(path))
                await File.WriteAllTextAsync(path, BuildSwiftScript(), ct);

            _scriptPath = path;
            return _scriptPath;
        }
        finally
        {
            _scriptLock.Release();
        }
    }

    private static void TryTerminate(Process process)
    {
        try
        {
            if (!process.HasExited)
                process.Kill(entireProcessTree: true);
        }
        catch
        {
        }
    }

    private static string BuildSwiftScript() =>
        """
        import Foundation
        import Vision
        import AppKit

        let args = CommandLine.arguments
        guard args.count >= 2 else {
            fputs("Missing image path\n", stderr)
            exit(2)
        }

        let imagePath = args[1]
        guard let image = NSImage(contentsOfFile: imagePath) else {
            fputs("Unable to load image\n", stderr)
            exit(3)
        }

        var rect = NSRect(origin: .zero, size: image.size)
        guard let cgImage = image.cgImage(forProposedRect: &rect, context: nil, hints: nil) else {
            fputs("Unable to create CGImage\n", stderr)
            exit(4)
        }

        let request = VNRecognizeTextRequest()
        request.recognitionLevel = .accurate
        request.usesLanguageCorrection = false
        request.recognitionLanguages = ["en_US"]

        let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
        do {
            try handler.perform([request])
            let observations = request.results ?? []
            let lines = observations.compactMap { $0.topCandidates(1).first?.string.trimmingCharacters(in: .whitespacesAndNewlines) }
                .filter { !$0.isEmpty }
            print(lines.joined(separator: "\n"))
        } catch {
            fputs("Vision OCR failed: \(error)\n", stderr)
            exit(5)
        }
        """;
}
