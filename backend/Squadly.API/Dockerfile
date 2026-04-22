# ═══════════════════════════════════════════════════════════════════════════
# Dockerfile для Squadly.API (ASP.NET Core 8 Web API)
# Multi-stage build: SDK для компіляції → aspnet runtime для запуску
# Розташування: backend/Squadly.API/Dockerfile
# ═══════════════════════════════════════════════════════════════════════════

# ЕТАП 1: BUILD (компіляція)
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY ["Squadly.Domain/Squadly.Domain.csproj", "Squadly.Domain/"]
COPY ["Squadly.Application/Squadly.Application.csproj", "Squadly.Application/"]
COPY ["Squadly.Infrastructure/Squadly.Infrastructure.csproj", "Squadly.Infrastructure/"]
COPY ["Squadly.API/Squadly.API.csproj", "Squadly.API/"]

RUN dotnet restore "Squadly.API/Squadly.API.csproj"

COPY . .

WORKDIR /src/Squadly.API
RUN dotnet publish "Squadly.API.csproj" \
    -c Release \
    -o /app/publish \
    /p:UseAppHost=false \
    --no-restore

# ЕТАП 2: запуск

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

COPY --from=build /app/publish .

EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080

ENTRYPOINT ["dotnet", "Squadly.API.dll"]
