# 👩‍💻 Development

The architecture, the auth design, and the rules for changing code are in [CLAUDE.md](../CLAUDE.md). The CI/CD pipeline is in [CI-CD.md](../CI-CD.md).

## 🛠️ Run locally

You need Node.js 22.12+ (24 LTS recommended).

```bash
npm install
bash scripts/generate-secrets.sh   # .env with TOTP_ENCRYPTION_KEY
npm run dev:server                 # API on :4000 (reads .env)
npm run dev                        # UI with hot reload on :5173
```

Or build once and let the server serve the UI: `npm run build && npm run dev:server`, then open http://localhost:4000.

## 🧪 Test accounts

Outside production (`NODE_ENV` isn't `production`), the server creates one account per role so you can try every permission right away:

| Role | Email | Password | Override in `.env` |
|------|-------|----------|-------------------|
| admin | `admin@example.com` | `Admin@12345` | `ADMIN_EMAIL`, `ADMIN_PASSWORD` (only used while no users exist) |
| manager | `manager@example.com` | `Manager@12345` | `TEST_MANAGER_EMAIL`, `TEST_MANAGER_PASSWORD` |
| user | `user@example.com` | `User@12345` | `TEST_USER_EMAIL`, `TEST_USER_PASSWORD` |

- Each one still has to set up 2FA on first sign-in.
- `SEED_TEST_USERS=false` turns them off.
- **They are never created in production.** The Docker image runs with `NODE_ENV=production`, so a real install needs `ADMIN_EMAIL` and `ADMIN_PASSWORD`.

## ✅ Tests

```bash
npm run build
npm test            # end-to-end API smoke test: sign-in, 2FA, RBAC, lockout, CSRF, data API, sessions
npm run test:ui     # browser test in headless Chrome or Edge (BROWSER_PATH=… to choose one)
npm audit
npm run security:scan   # Snyk, after `snyk auth`
```

Both test scripts start their own server on throwaway copies of `data/` and a temporary state folder, so they never touch your data. CI runs all of them on every push. See [CI-CD.md](../CI-CD.md).

## 📁 Project layout

```
server/            Express 5 API: auth + 2FA, RBAC, data API, file session store
src/               Svelte 5 UI (Svelte 4 syntax, compiled in legacy mode)
  lib/components/          one component per view
  lib/components/manage/   Manage Data editors
scripts/           generate-secrets.sh, smoke-test.mjs, ui-test.mjs
data/              example corpus (generic, safe to publish)
docs/              these docs
```
