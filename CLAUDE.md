# CLAUDE.md

Self-hosted literature review tracker: an Express 5 API (Node 24) with a Svelte 5 + Vite 8 SPA. Components are written in Svelte 4 syntax, which Svelte 5 compiles in legacy mode. Corpus content lives in plain JSON files and users in a JSON file. There is no database. Sign-in requires 2FA (TOTP) for every account, and access is role-based (RBAC). The auth design follows [nuttkku/2FA-example-coding](https://github.com/nuttkku/2FA-example-coding).

## Workflow rules (standing agreement)

1. **Read [CI-CD.md](CI-CD.md) before starting a feature.** It lists what CI enforces and how to run the same checks locally.
2. **Before committing:** `npm run build && npm test && npm run test:ui`. If Snyk is authenticated, also run `npm run security:scan` and take every finding seriously before calling it a false positive.
3. **If a change touches sign-in, 2FA, roles, or the data API, add checks to [scripts/smoke-test.mjs](scripts/smoke-test.mjs). If it changes a screen, add them to [scripts/ui-test.mjs](scripts/ui-test.mjs).** These are the regression suites, and CI runs both. The UI test has already caught two bugs that the API test couldn't see.
4. **When a task is finished, commit and push to GitHub** (`origin`, branch `main`) without waiting to be asked. Update this file with new design decisions, and the docs when users would notice the change: `README.md` (Thai, the main user manual) and `README.en.md` (English) together, or the right file in `docs/` (configuration, data format, development).
5. This repo is a public template. Never commit real research data, personal names, or secrets. `data/` holds only the generic example corpus. The UI is bilingual (Thai default, English), see "Languages" below; code comments and docs other than `README.md` are in English.

## Commands

```bash
npm install
bash scripts/generate-secrets.sh     # .env with TOTP_ENCRYPTION_KEY + first admin
npm run dev:server                   # API on :4000 (node --env-file=.env)
npm run dev                          # Vite UI on :5173, proxies /api
npm run build && npm test            # build + end-to-end smoke test (API)
npm run test:ui                      # browser test in headless Chrome/Edge
npm run security:scan                # snyk test + snyk code test (needs `snyk auth`)
docker compose up -d --build         # app on :3000
```

## Layout

- `server/index.js` – wiring: helmet/CSP, session, routes, data API, error handler
- `server/config.js` – env parsing. Fails fast without a valid `TOTP_ENCRYPTION_KEY` (deliberately no default)
- `server/permissions.js` – **the RBAC map**: roles `admin | manager | user`, permissions `corpus:read`, `corpus:write`, `users:read`, `users:write`, `audit:read`
- `server/middleware.js` – `requirePreAuth(stage)`, `requireAuth()`, `requirePermission(p)`, rate limiters
- `server/routes/auth.js` – login → 2FA setup/verify, me, change password, backup codes
- `server/routes/admin.js` – user management and audit log (all behind `requireAuth` + a permission)
- `server/users.js` – user store (`STATE_DIR/users.json`): lockout, TOTP state, backup codes, `sessionVersion`, and migration of legacy `APP_USER_*` env users
- `server/crypto.js` – AES-256-GCM for TOTP secrets, bcrypt helpers, backup code format
- `server/twofa.js` – otplib TOTP + QR. `matchTotpStep` returns the time step for replay protection
- `server/audit.js` – append-only JSONL audit log in `STATE_DIR/audit.log`
- `server/data.js`, `server/dataStore.js`, `server/appData.js`, `server/papers.js` – corpus read and write (see "Data model")
- `src/App.svelte` – shell. Tabs are gated with `can(user, permission)` using the permissions the server sends in `/api/auth/me`
- `src/lib/components/Login.svelte` – the whole sign-in flow (password → setup or verify → backup codes); `ForcePasswordChange.svelte`, `AccountPanel.svelte`, `UsersView.svelte`, `AuditLogView.svelte`
- `src/lib/components/manage/` – data editors (`CollectionEditor` + `ItemForm` schema-driven, `ComparisonEditor` grid)
- `src/lib/xlsx.js` – Excel export through `write-excel-file`, which replaced the vulnerable `xlsx`

## Auth design (read before touching sign-in)

- **The session has two stages.** `req.session.preAuth = { userId, stage: 'setup'|'verify', expiresAt }` (5 min) is set after a correct password. `req.session.auth = { userId, sessionVersion }` is set **only** by `/2fa/setup/confirm` or `/2fa/verify`. No route grants `auth` from a password alone. The session id is regenerated at both steps.
- **2FA can't be disabled.** Admins can only *reset* it (clears the secret and backup codes, bumps `sessionVersion`), which forces setup at the next sign-in.
- **TOTP:** window ±1 step. `totpLastStep` stores the last accepted step, and any code at or before it is rejected (no replay). Secrets are encrypted with AES-256-GCM, with the auth tag length pinned to 16. Changing `TOTP_ENCRYPTION_KEY` breaks every stored secret.
- **Backup codes:** 10, format `XXXX-XXXX` (no 0/O/1/I/L), bcrypt-hashed, single use, shown once. Regenerating replaces all of them.
- **`requireAuth` re-reads the user on every request.** `status !== 'active'`, a `sessionVersion` mismatch, or `totpEnabled === false` → 401. Bumping `sessionVersion` (disable, password reset, 2FA reset, own password change) signs the user out everywhere. Own password change moves the current session to the new version.
- **`mustChangePassword`** (admin-created or admin-reset accounts) → every API returns 403 `password_change_required` except `me`, `change-password`, and `logout`.
- **Login hardening:** one bcrypt comparison always runs (`DUMMY_HASH` for unknown emails, so timing doesn't reveal accounts). Unknown email and wrong password get the same message. "Disabled" is only revealed after a correct password. Per-account lockout after `LOGIN_MAX_ATTEMPTS` (persisted). IP rate limits: 20 per 15 min (login), 10 per 5 min (2FA), and 600 per minute for every request.
- **CSRF:** on top of SameSite=Lax, `sameOrigin` rejects a state-changing `/api` request whose Origin or Referer is another host.
- **Default test accounts** (`DEV_ACCOUNTS` in `users.js`): admin/manager/user `@example.com` with `Admin@12345` / `Manager@12345` / `User@12345`, overridable by env. They are created **only when `NODE_ENV !== 'production'`** (and `SEED_TEST_USERS` isn't `false`). Keep it that way: on a reachable server, whoever signs in first with a default password would enrol their own 2FA and own the account. The Docker image sets `NODE_ENV=production`.
- **Admin guards:** an admin can't demote, disable, or delete themselves, and there is always at least one active admin.
- **`TRUST_PROXY` defaults to false.** Trusting `X-Forwarded-For` without a real proxy lets clients spoof `req.ip`, which feeds the rate limits and the audit log.
- **CSP (helmet):** `script-src 'self'`, so the theme bootstrap lives in `public/theme.js`, not inline. `worker-src blob:` because write-excel-file zips in a Web Worker. `upgrade-insecure-requests` and HSTS only when `COOKIE_SECURE=true`.
- **Sessions** use `FileSessionStore` (`server/sessionStore.js`): kept in memory, mirrored to `STATE_DIR/sessions.json` (batched writes, flushed on SIGTERM/SIGINT), expired ones pruned every 15 minutes. Session ids are stored only as SHA-256 hashes. This works for a single instance; use a shared store if it ever runs as more than one.

## Data model notes

- The collections are `config, domains, papers, comparison, gaps, citations, pipeline, rejected`, each stored as `<name>.json` in `DATA_DIR`. In the app-data payload, `pipeline` is called `stackLayers`, and comparison is split into `dimensions` / `dimensionCells`.
- `PUT /api/data/:name` (`corpus:write`) validates and whitelists fields (`dataStore.js`), keeps a `.bak`, writes atomically, and prunes references when papers are deleted.
- Paper `id` is unique across domains. `num` is `id` padded to two digits, set by the server.
- `comparison.cells[domainId][paperId][dimIndex]`: a missing cell means `no`.
- The corpus is sent only through the authenticated API and never bundled into `dist/`.
- To add a field to a collection, update the validator in `dataStore.js`, the field schema in `ManageData.svelte`, the view that shows it, and [docs/DATA-FORMAT.md](docs/DATA-FORMAT.md).

## Languages (Thai / English)

- All UI text lives in `src/lib/i18n.js` as `'key': [English, Thai]`. Components use `$t('key', { param })`; never hard-code UI text in a component. A value can be a function of the params (English plurals).
- `lang` is a store (`th` default, kept in `localStorage.lang`, mirrored to `<html lang>`). `LangToggle.svelte` switches it on the sign-in card and in the sidebar.
- Labels kept in `const` arrays (field schemas, status maps) must be `$:` reactive so they re-render when the language changes.
- Dates go through `$fmtDate` / `$fmtDateTime`: `th-TH` gives the Buddhist Era (พ.ศ.). Paper `year` stays CE because it is the citation year.
- Server error messages stay English (the smoke test checks them). `translateServerError` in `i18n.js` maps them to Thai in `auth.js`; add a row there when you add a server message. Unknown messages are shown as sent.
- Corpus content is never translated. Excel export headers follow the current language.
- `scripts/ui-test.mjs` checks the Thai default, a translated server error and Buddhist-era dates, then switches to English, so the rest of the test can find buttons by their English text.

## Svelte 5 legacy-mode gotchas

- Mount with `mount(App, { target })` from `svelte`, not `new App()`.
- In a component that binds `draft[f.key]` inside `{#each fields as f}`, assigning `draft[key] = …` in a script function compiles to code that references `f` and throws `ReferenceError: f is not defined`. Replace the whole object instead: `draft = { ...draft, [key]: … }`.

## Dependencies policy

`dependencies` = anything that runs in production: server packages **and** libraries bundled into the browser (svelte, write-excel-file, html-to-image). `devDependencies` = build tooling only (vite, @sveltejs/vite-plugin-svelte). CI's blocking `npm audit --omit=dev --audit-level=high` and `snyk test` (prod deps by default) rely on this split, so put a new browser library in `dependencies`.
