# Social Media Pipeline — v3.0

A multi-role agency workflow tool for planning, editing, writing, and publishing social media campaigns.

---

## What's in v3.0

- **SQLite database** (built into Node 22 — no external packages needed). Data persists in `pipeline.db` in the project folder.
- **Clean Slack setup UI** — 3-step form, show/hide webhook URL, toggle on/off
- **CSV export/import** — download campaigns as CSV, open in Excel or Google Sheets, re-import back. No OAuth needed.
- **JSON backup** — full data backup with one click
- **Production-ready** — build once, run with `node` or `pm2`. No VS Code needed.

---

## Quick Start (Development)

```bash
# 1. Install dependencies
npm install

# 2. Copy env file and optionally add API keys
cp .env.example .env

# 3. Run in dev mode
npm run dev
```

Open http://localhost:3000

---

## Production Build (Run without VS Code)

```bash
# 1. Build the app
npm run build

# 2. Start the server
npm start
```

The app runs at http://localhost:3000. Press Ctrl+C to stop.

---

## Run in Background (Stays on after closing terminal)

Install PM2 globally (one time):
```bash
npm install -g pm2
```

Then:
```bash
# Build first
npm run build

# Start in background
npm run start:pm2

# To auto-restart on system boot
pm2 startup
pm2 save

# Stop
npm run stop:pm2

# View logs
pm2 logs social-media-pipeline
```

---

## Slack Setup (in the app)

1. Go to **Studio Insights Hub** (login as `insights`)
2. In the **Slack Notifications** panel:
   - Paste your Incoming Webhook URL (get from api.slack.com/messaging/webhooks)
   - Optionally add your Member ID to get @mentioned
   - Toggle **Enable** on
3. Click **Send Test Message** to verify

---

## Data Management

All data exports are in **Studio Insights Hub → Data & Logs**:

| Button | What it does |
|--------|-------------|
| Export Campaigns CSV | Download all campaigns as a .csv file |
| Export Activity Log | Download the full activity history |
| Backup as JSON | Full data backup |
| Import from CSV | Re-import a previously exported CSV |

---

## Default Login Passcodes

| Role | Passcode |
|------|----------|
| Planner | `planner` |
| Video Editor | `editor` |
| Designer | `designer` |
| Writer | `writer` |
| Publisher | `publisher` |
| Dashboard / Admin | `insights` |

---

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `GEMINI_API_KEY` | AI caption generation (optional) |
| `SLACK_WEBHOOK_URL` | Default Slack webhook (optional, can set in UI) |
| `PORT` | Server port (default: 3000) |

---

## Database

Data is stored in `pipeline.db` (SQLite) in the project root. Back it up by copying the file. Restore by replacing it.

