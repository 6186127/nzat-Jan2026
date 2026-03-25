Place these files on the primary Linux server at:

`/www/wwwroot/NZAT.NET/`

This primary node keeps the Postgres container locally and exposes it on port `5437` for the secondary node to use. It remains the only node that should run background jobs by default.

The GitHub Actions workflow uploads these files automatically on every deploy:

- `docker-compose.yml`
- `deploy.sh`
- `env.example`

You still need to create and maintain `.env` on the server.

Recommended first-time setup on the Linux server:

```bash
mkdir -p /www/wwwroot/NZAT.NET
cp /www/wwwroot/NZAT.NET/env.example /www/wwwroot/NZAT.NET/.env
chmod +x /www/wwwroot/NZAT.NET/deploy.sh
```

Fill the `.env` values before the first deploy.

Primary Linux defaults:

- `POSTGRES_PORT=5437`
- `DB_CONN_STRING=Host=db;Port=5432;...`

Secondary Mac should point its `DB_CONN_STRING` at the Linux server's public database endpoint, for example:

```dotenv
DB_CONN_STRING=Host=45.114.124.101;Port=5437;Database=workshop;Username=postgres;Password=...
```
