namespace Workshop.Api.Options;

public sealed class ImageOcrOptions
{
    public const string SectionName = "ImageOcr";

    public bool Enabled { get; set; } = true;
    public int TimeoutSeconds { get; set; } = 20;
}
