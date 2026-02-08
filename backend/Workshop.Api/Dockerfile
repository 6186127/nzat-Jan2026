FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY nzat-Jan2026.sln ./
COPY backend/Workshop.Api/Workshop.Api.csproj backend/Workshop.Api/
COPY backend/CarjamImporter/CarjamImporter.csproj backend/CarjamImporter/

RUN dotnet restore backend/Workshop.Api/Workshop.Api.csproj

COPY backend ./backend

RUN dotnet publish backend/Workshop.Api/Workshop.Api.csproj -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /app/publish ./
ENV ASPNETCORE_URLS=http://0.0.0.0:$PORT
EXPOSE 8080
ENTRYPOINT ["dotnet", "Workshop.Api.dll"]
