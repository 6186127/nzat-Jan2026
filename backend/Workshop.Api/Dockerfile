FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Build context is backend/Workshop.Api. Copy local sources.
COPY . .

# Fetch CarjamImporter into /CarjamImporter so ProjectReference resolves.
# If your repo is private, replace the URL with one that includes a token.
RUN if [ ! -f /CarjamImporter/CarjamImporter.csproj ]; then \
      apt-get update && apt-get install -y --no-install-recommends git ca-certificates && \
      git clone --depth 1 https://github.com/6186127/nzat-Jan2026.git /tmp/repo && \
      cp -R /tmp/repo/backend/CarjamImporter /CarjamImporter && \
      rm -rf /var/lib/apt/lists/* /tmp/repo ; \
    fi

RUN dotnet restore Workshop.Api.csproj
RUN dotnet publish Workshop.Api.csproj -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /app/publish ./
ENV ASPNETCORE_URLS=http://0.0.0.0:$PORT
ENTRYPOINT ["dotnet", "Workshop.Api.dll"]
