[README.md](https://github.com/user-attachments/files/27012032/README.md)
# SpellBot for Slack

A Slack bot that spell-checks text and analyzes video frames/screenshots for supers, lower thirds, chyrons, and other on-screen text — powered by Claude.

---

## Setup

### 1. Create a Slack App

1. Go to https://api.slack.com/apps → **Create New App** → **From scratch**
2. Name it `SpellBot`, pick your workspace

### 2. Enable Socket Mode
- Go to **Socket Mode** in the sidebar → Enable it
- Create an App-Level Token with `connections:write` scope
- Copy the token (starts with `xapp-`) → this is your `SLACK_APP_TOKEN`

### 3. Set Bot Permissions
Go to **OAuth & Permissions** → add these Bot Token Scopes:
- `chat:write`
- `files:read`
- `app_mentions:read`
- `im:history`
- `im:read`
- `im:write`

### 4. Enable Events
Go to **Event Subscriptions** → Enable → Subscribe to these bot events:
- `message.im` (for DMs)
- `app_mention` (for @mentions in channels)

### 5. Install the App
Go to **OAuth & Permissions** → **Install to Workspace**
Copy the **Bot User OAuth Token** (starts with `xoxb-`) → this is your `SLACK_BOT_TOKEN`

Copy the **Signing Secret** from **Basic Information** → this is your `SLACK_SIGNING_SECRET`

---

## Local Setup

```bash
# Clone / copy these files into a folder
cd spellbot

# Install dependencies
npm install

# Copy and fill in your environment variables
cp .env.example .env
# Edit .env with your tokens

# Run the bot
npm start
```

---

## Environment Variables

| Variable | Where to find it |
|---|---|
| `SLACK_BOT_TOKEN` | OAuth & Permissions → Bot User OAuth Token |
| `SLACK_SIGNING_SECRET` | Basic Information → Signing Secret |
| `SLACK_APP_TOKEN` | Socket Mode → App-Level Token |
| `ANTHROPIC_API_KEY` | https://console.anthropic.com |

---

## Usage

**In a DM with SpellBot:**
- Send any text → it spell-checks it
- Attach a screenshot or video frame → it extracts and checks all on-screen text

**In a channel:**
- `@SpellBot Check this text for spelling`
- `@SpellBot` + attach an image/video frame → analyzes supers and text overlays

---

## Deploy to Production

For always-on hosting, deploy to one of these (all have free tiers):

- **Railway**: https://railway.app — connect your GitHub repo, add env vars, done
- **Render**: https://render.com — similar to Railway
- **Fly.io**: https://fly.io — `fly launch` then `fly deploy`

No need to change any code — Socket Mode means no public URL required.
