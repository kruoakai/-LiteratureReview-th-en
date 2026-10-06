# ⚙️ Configuration

Set these in `.env` next to `docker-compose.yml` (Docker Compose reads it), or in the environment of `npm start`. [`scripts/generate-secrets.sh`](../scripts/generate-secrets.sh) creates a `.env` with the required values filled in.

| Variable | Default | Purpose |
|----------|---------|---------|
| `TOTP_ENCRYPTION_KEY` | — (**required**) | 64 hex characters that encrypt users' 2FA secrets. Never change it once users have set up 2FA |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | — | Create the first admin while no users exist. Required in production |
| `PORT` | `4000` (`80` in Docker) | HTTP port |
| `DATA_DIR` | `./data` | Folder with the JSON files. Must be writable for **Manage Data** |
| `PAPERS_DIR` | `./papers` | Folder with the PDFs |
| `STATE_DIR` | `./state` | Users, sessions, session secret, audit log |
| `COOKIE_SECURE` | `false` | `true` when served over HTTPS. Also turns on HSTS |
| `TRUST_PROXY` | `false` | Number of reverse-proxy hops to trust for the client IP (e.g. `1`). Leave `false` without a proxy, otherwise clients can fake their IP and get around the rate limits |
| `TWOFA_ISSUER` | `Literature Review Tracker` | Name shown next to the code in authenticator apps |
| `SESSION_SECRET` | generated | Fixed session secret (32+ characters). If unset, one is generated into `state/` |
| `LOGIN_MAX_ATTEMPTS`, `LOGIN_LOCK_MINUTES` | `5`, `15` | Account lockout after wrong passwords |
| `RATE_LIMIT_LOGIN`, `RATE_LIMIT_2FA` | `20`, `10` | Requests per IP per 15 min (sign-in) and per 5 min (2FA) |
| `RATE_LIMIT_API` | `600` | All requests per IP per minute |
| `SEED_TEST_USERS` | `true` outside production | Create the development test accounts (see [DEVELOPMENT.md](DEVELOPMENT.md#-test-accounts)). Ignored in production |
| `TEST_MANAGER_EMAIL` / `_PASSWORD`, `TEST_USER_EMAIL` / `_PASSWORD` | see DEVELOPMENT.md | Override the test accounts |

Sessions are saved in `state/sessions.json` (session ids stored only as hashes), so restarting the app doesn't sign anyone out.

## 🔒 Behind HTTPS

For anything beyond your own machine, put a reverse proxy in front, such as Caddy, nginx, or Traefik. For example, a Caddyfile:

```
review.example.org {
    reverse_proxy localhost:3000
}
```

Then set `COOKIE_SECURE=true` and `TRUST_PROXY=1` in `.env` and run `docker compose up -d`.

## ⬆️ Upgrading from older versions

- **Users from before 2FA** were stored as `APP_USER_*` lines in `AUTH_ENV_PATH` (`state/users.env` in Docker). On start they are moved into `state/users.json` with their passwords and roles unchanged, and each person sets up 2FA at their next sign-in.
- **Papers from the old "+ Add Paper" form** in `custom-papers.json` (`CUSTOM_PAPERS_PATH`) are moved into `data/papers.json`. A paper whose id is already taken gets a new number, and the old file is renamed to `custom-papers.json.migrated`.
- **2FA secrets from otplib 12** (10 bytes) keep working after the move to otplib 13. New secrets are 20 bytes.
