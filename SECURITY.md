# Security policy

## Reporting a vulnerability

Please **don't open a public issue** for security problems. Report them privately via
[GitHub private vulnerability reporting](https://github.com/nuttkku/literature-review-tracker/security/advisories/new)
(*Security → Report a vulnerability*). Include what you found, how to reproduce it, and the version or commit.

You should get a reply within a week. Fixes are released as a new version, and the advisory is
published once people have had a chance to update.

## Supported versions

Only the latest release gets security fixes.

## Running it safely

- Run it with `NODE_ENV=production` (the Docker image does). The default test accounts are
  created only outside production.
- Serve it over HTTPS behind a reverse proxy and set `COOKIE_SECURE=true` and `TRUST_PROXY=1`.
- Keep `TOTP_ENCRYPTION_KEY` secret and back it up separately from `state/`.
- See [README.en.md](README.en.md#-sign-in-and-two-factor-authentication) for how sign-in and 2FA work,
  and [CI-CD.md](CI-CD.md#scanner-findings) for scanner results and reviewed false positives.
