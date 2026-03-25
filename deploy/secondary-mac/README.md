Place these files on the secondary Mac at:

`/Users/lynn/www/wwwroot/NZAT.NET/`

The secondary node is intended to share the same database as the primary node, but it should not run background jobs.

The GitHub Actions workflow uploads these files automatically on every deploy:

- `docker-compose.yml`
- `deploy.sh`
- `env.example`

You still need to create and maintain `.env` on the Mac.

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
