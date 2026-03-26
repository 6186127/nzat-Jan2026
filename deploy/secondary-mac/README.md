Place these files on the secondary Mac at:

`/Users/lynn/www/wwwroot/NZAT.NET/`

The secondary node is intended to share the same database as the primary node, but it should not run background jobs.

The GitHub Actions workflow uploads these files automatically on every deploy:

- `docker-compose.yml`
- `deploy.sh`
- `env.example`

You still need to create and maintain `.env` on the Mac.

Prerequisite on the Mac:

- Install Docker Desktop, or install a Docker CLI that includes `docker compose`
- If you use standalone Homebrew `docker-compose`, make sure it exists under `/opt/homebrew/bin/docker-compose` or `/usr/local/bin/docker-compose`

Recommended copy steps on the Mac:

```bash
mkdir -p /Users/lynn/www/wwwroot/NZAT.NET
```

Recommended first-time setup on the Mac:

```bash
cp /Users/lynn/www/wwwroot/NZAT.NET/env.example /Users/lynn/www/wwwroot/NZAT.NET/.env
chmod +x /Users/lynn/www/wwwroot/NZAT.NET/deploy.sh
```

The `.env` values must be filled in before first deploy.
