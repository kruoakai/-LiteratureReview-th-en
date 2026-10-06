# 📚 Literature Review Tracker

[🇹🇭 ภาษาไทย](README.md) · 🇬🇧 English

> 🌐 This version is adapted from [nuttkku/literature-review-tracker](https://github.com/nuttkku/literature-review-tracker) and adds a bilingual **Thai / English** UI (Thai by default, Buddhist-era dates). See [🌐 Language](#-language-thai--english).

A self-hosted web app for running the **literature review** of a thesis or dissertation.

You decide which research domains your review has to cover. Then you log every paper you read: into the corpus with your notes, or onto a rejected list with the reason. The app shows how well each domain is covered and where the gaps are, and gives you tables and citation sentences to paste into your chapters.

- 🔐 **Secure:** every account signs in with a password **and** an authenticator app. 2FA is required and can't be turned off, and each person can only do what their role allows.
- 💾 **Your data stays yours:** everything is kept in plain JSON files on your own machine. No cloud, no database.

> 🤖 **Tip: easiest with an AI assistant**
>
> Clone this repo and open it with an AI coding assistant such as [Claude Code](https://claude.com/claude-code). The repo includes [CLAUDE.md](CLAUDE.md), which explains the structure, how to run it, and how to test it, so the assistant can help right away without extra explaining. Ask in plain language, for example:
>
> - 💬 "Install this and open the app for me"
> - 💬 "Import the papers from this BibTeX / Excel file into the corpus"
> - 💬 "Add a field for the dataset each paper uses"
>
> ⚠️ The assistant can read the files in the folder, including your research data in `data/`. If that data is unpublished or confidential, check your AI tool's data terms first.
>
> You don't need AI. The [install](#-install) steps below work on their own.

---

## ✨ What you get

| View | What it shows |
|------|---------------|
| 📄 **Papers** | Papers grouped by domain, with search, sorting, a relevance score, and four notes: what the paper does, how, its results, and how you'll use it |
| 📊 **Comparison** | Every paper scored on your own rubric. Exports to `.xlsx`, PNG, or JPG for your thesis |
| 🗂️ **Domain Tables** | One table of papers per domain. Exports to `.xlsx` |
| 🔍 **Gap Analysis** | Research gaps with priority, status, evidence, and what to search next |
| ✍️ **Citations** | Ready-to-paste citation sentences, sorted by where they go in your thesis |
| 🧭 **Pipeline** | How your domains connect into your method, with progress bars against each target |
| 📈 **Charts** | Papers per domain and the spread of relevance scores |
| 🚫 **Rejected Papers** | What you read and excluded, and why, so you can describe your selection process clearly |
| 🛠️ **Manage Data** *(admin, manager)* | Forms to add, edit, and delete everything above |
| 👥 **Users** *(admin, manager)* | Accounts, roles, and 2FA status. Admins can add, disable, and reset users |
| 📜 **Audit Log** *(admin)* | Sign-ins, failed attempts, 2FA events, admin actions, and data saves |

---

## 🚀 Install

You need:

- 🐳 [Docker](https://docs.docker.com/get-docker/) with Docker Compose
- 📱 An authenticator app on your phone: Google Authenticator, Microsoft Authenticator, Authy, 1Password, …

```bash
git clone https://github.com/nuttkku/literature-review-tracker.git && cd literature-review-tracker
bash scripts/generate-secrets.sh   # creates .env with a random 2FA encryption key and first-admin password
docker compose up -d --build
```

1. The script prints the first admin's email and password.
2. Open **http://localhost:3000** and sign in.
3. Scan the QR code with your authenticator app and save the backup codes.
4. After you're signed in, you can delete `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `.env`. They're only used to create the first admin while there are no users yet.

> ⚠️ **Keep `TOTP_ENCRYPTION_KEY` in `.env` safe and never change it.** It encrypts everyone's 2FA secret. If it's lost or changed, nobody can complete 2FA again. Recovering means deleting `state/users.json` and starting over from the first admin.

📁 **Folders on your machine**

| Folder | Contents |
|--------|----------|
| `data/` | Your review data (JSON). **Manage Data** saves here |
| `papers/` | Paper PDFs (optional) |
| `state/` | Users, 2FA state, sessions, and the audit log |

- 🐧 **On Linux:** the container doesn't run as root. It runs as uid 1000, which must be able to write `data/` and `state/`. If it can't, run `sudo chown -R 1000:1000 data state`.
- 🔄 **To update:** run `git pull`, then `docker compose up -d --build`. Your `data/` and `state/` are kept.
- 🌐 **To let others in over the internet:** put an HTTPS reverse proxy (Caddy, nginx, Traefik) in front, and set `COOKIE_SECURE=true` and `TRUST_PROXY=1` in `.env`. Without a proxy, leave `TRUST_PROXY=false`. All other settings are in [docs/CONFIGURATION.md](docs/CONFIGURATION.md).

---

## 🔐 Sign-in and two-factor authentication

Every account **must use 2FA**. Nobody can turn it off, not even an admin.

1. 🔑 **Password:** a correct password alone never gets you in.
2. 📷 **First sign-in**, or after an admin resets your 2FA: scan the QR code with your authenticator app and enter the 6-digit code. You then get **10 backup codes**, shown only once. Keep them safe.
3. 🔢 **Every later sign-in:** enter the 6-digit code from the app. Each code works once. If you lost your phone, use a backup code instead; each of those also works once.
4. 🔁 **Temporary passwords:** if an admin created your account or reset your password, you must choose your own password right after signing in.

👤 Click your email at the bottom of the left sidebar to open your account panel. From there you can change your password and create new backup codes.

🆘 **Lost your phone and out of backup codes?** Ask an admin to **Reset 2FA**, then set it up again at your next sign-in.

🛡️ **Other protections**

- **Lockout:** an account locks for 15 minutes after 5 wrong passwords. An admin password reset unlocks it.
- **Rate limits:** sign-in and 2FA attempts are limited per IP.
- **Immediate sign-out:** changing someone's role, disabling their account, or resetting their password or 2FA signs them out everywhere at once.

---

## 👥 Roles

| Permission | admin | manager | user |
|------------|:-----:|:-------:|:----:|
| 👀 See every view, download PDFs | ✅ | ✅ | ✅ |
| ✏️ Edit data (**Manage Data**) | ✅ | ✅ | |
| 📋 See the user list (**Users**) | ✅ | ✅ | |
| ⚙️ Add users, change roles, disable, reset password / 2FA, delete | ✅ | | |
| 📜 Read the **Audit Log** | ✅ | | |

- 👑 **admin:** runs the app and manages accounts
- 🧑‍🔬 **manager:** a co-researcher or research assistant who maintains the data
- 👓 **user:** read-only, e.g. a supervisor or examiner

---

## 🌐 Language (Thai / English)

The screens are in **Thai by default**. Click **ไทย / EN** on the sign-in screen or at the bottom of the left sidebar to switch at any time. The browser remembers your choice.

- 🗓️ **Dates:** Thai shows the Buddhist Era (e.g. 6 ต.ค. 2569); English shows the Common Era.
- 📚 **Publication years** of papers always stay CE, to match your citations.
- ✍️ **Your research data** (titles, notes, citation sentences) is shown exactly as entered, never translated.
- 📊 **Excel exports** use column headers in the language you have selected.

---

## 🧭 Doing your review, step by step

The app is built around the steps below. Every step happens in **🛠️ Manage Data**, under *Views* in the left sidebar. You need an admin or manager account to see it.

### 1️⃣ Set up the app

The app comes with a small example corpus on time-series forecasting, so every view has something to show. Look around, then [clear it out](#-starting-from-an-empty-corpus).

In **Manage Data → Settings**, set the app title (for example your thesis title), an icon, and a subtitle.

### 2️⃣ Define your domains

A *domain* is one strand of literature your review has to cover, such as "Recurrent sequence models" or "Reinforcement learning for control". Most reviews have 3–6.

In **Manage Data → Domains**, add one entry per domain:

- 🔢 **Domain number:** shown as D1, D2, …
- 🏷️ **Short name, full name, description**
- 🎯 **Target paper count:** how many papers you aim to include. The progress bars measure against this number.
- 🔎 **Search keywords:** the exact search strings you use in Scopus, Google Scholar, and so on. Writing them down makes your search reproducible.
- 🎨 **Slug and color:** the slug is also the folder name for that domain's PDFs.

### 3️⃣ Log every paper you read

For each paper you screen, make one decision:

- ✅ **Include it:** go to **Manage Data → Papers → + Add paper**. Choose its domain, give it a relevance score from 1 to 10, and fill in the four notes:
  - **What:** the paper in one or two sentences
  - **How:** its method
  - **Results:** what it found
  - **Usage:** where you'll cite it and why

  Tags are quick labels, such as "Baseline model" (positive) or "Not time-series data" (warning). Tick ⚠️ **Cite with caution** for preprints or weak evidence.
- ❌ **Exclude it:** go to **Manage Data → Rejected → + Add rejected paper**. Record a short **reason** and the **batch** (the search round it came from).
  - To withdraw a paper you had already included: delete it from Papers first, then add it here with status `removed` and its old number in **Freed paper number**.

The counts in the sidebar update as you go: papers read, included, rejected, and removed later.

### 4️⃣ Score the papers on a rubric

In **Manage Data → Comparison**, list the **dimensions** every paper is judged on, for example "Uses real-world data" or "Evaluates decision-making". Then pick a domain and set a status for each paper and dimension:

| Status | Meaning |
|--------|---------|
| ✓ Yes | Fully covers it |
| ◑ Partial | Partly covers it |
| · Note | Relevant, with a remark |
| — No | Doesn't cover it (default) |

Each cell can also take a short note. The **📊 Comparison** view shows one table per domain, ready to export as Excel or an image for your literature review chapter.

### 5️⃣ Record the gaps

The rubric shows what the existing literature hasn't done yet. In **Manage Data → Gaps**, record each gap with:

- a priority
- a status (`open` / `partial` / `closed`)
- evidence (one line per paper)
- the opportunity it gives your study
- what to search next

When new papers cover a gap, change its status to `closed`.

### 6️⃣ Draft your citations

In **Manage Data → Citations**, attach a ready-written sentence to a paper, with where it goes (for example "Chapter 2: Related work") and a short label. The **✍️ Citations** view sorts them by where they go and gives each a copy button.

### 7️⃣ Draw the research pipeline

In **Manage Data → Pipeline**, describe how the domains feed into your method, step by step: 1, 2, 3, each linked to a domain and its key papers. Use step `0` for one concern that runs across every step, such as evaluation or ethics. The page headings are set in **Settings**.

### 8️⃣ Use it in your writing

- 📤 Export comparison tables from **Comparison** (`.xlsx`, PNG, JPG) and paper lists from **Domain Tables** (`.xlsx`).
- 📋 Copy citation sentences from **Citations**.
- 📈 Use **Charts** and the rejected-paper counts when you describe how you searched and selected papers.

---

## 📎 Attaching PDFs (optional)

Put files in `papers/<domain slug>/D<domain number>-<paper number>-<any name>.pdf`.

Example: `papers/domain-1-sequence-models/D1-01-lstm.pdf`

The paper number must match its number in the corpus. Signed-in users then get a download button on that paper. New files show up when you refresh the page.

## 🧹 Starting from an empty corpus

Delete the example entries in **Manage Data**: papers first, then domains. Or reset the files directly:

```bash
for f in papers domains gaps pipeline rejected; do echo '[]' > data/$f.json; done
echo '{}' > data/citations.json
echo '{ "dimensions": [], "cells": {} }' > data/comparison.json
```

Then start again from step 2️⃣, defining your domains.

## 💾 Backups

- 📁 **`data/`:** each save from **Manage Data** keeps the previous version as `*.json.bak`, which gives you one step of undo. For real history, make `data/` a Git repository and commit it now and then.
- 🔐 **`state/`:** users, 2FA state, and the audit log. Back it up **together with `TOTP_ENCRYPTION_KEY` from `.env`**, because the users file is useless without that key. Keep the two in separate places.

---

## 📖 More documentation

| Document | For |
|----------|-----|
| ⚙️ [docs/CONFIGURATION.md](docs/CONFIGURATION.md) | Every environment variable, and upgrading from older versions |
| 🗃️ [docs/DATA-FORMAT.md](docs/DATA-FORMAT.md) | The JSON file formats, if you'd rather edit files by hand or import from another tool |
| 👩‍💻 [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) | Local development, test accounts, running the tests |
| 🔄 [CI-CD.md](CI-CD.md) | CI/CD and security scanning |
| 🛡️ [SECURITY.md](SECURITY.md) | Reporting a vulnerability |

## 🙏 Credits and background

Developed by **Wanut Padee**,
Computer Technical Officer, Digital Infrastructure Section, Office of Digital Technology, Khon Kaen University.

💡 **Why it exists:** the developer's own pain point. After reading a lot of papers, it was easy to forget which ones had been read, why one was excluded, or where it was supposed to be cited 😅 This tool keeps all of that in one place.

🤖 **All of the code and documentation was written with AI** ([Claude Code](https://claude.com/claude-code)), based on the developer's ideas and needs. The developer set the direction for design, security, and testing, and reviewed the results.

## 📄 License

MIT
