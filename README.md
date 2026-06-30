# Soulbot

Soulbot is a full-stack Twitch Chat Bot and loyalty platform powered by Nuxt, Vue 3, Drizzle ORM, and SQLite.

## Development Commands

- **Run Dev Server**: `pnpm run dev`
- **Build Production**: `pnpm run build`
- **Run Tests**: `pnpm test:run`
- **Type Check**: `npx nuxt typecheck`
- **Lint & Fix**: `pnpm run lint:fix`

---

## Discord Bot Integration Setup Guide

The Discord bot integration is optional. It mirrors Twitch event alerts into text channels and auto-bestows roles to users joining your server.

### 1. Create a Discord Developer Application

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications).
2. Click **New Application**, give it a name (e.g. `Soulbot`), and click **Create**.
3. Under the **Bot** tab:
   - Click **Reset Token** and copy the **Bot Token**.
   - Under **Privileged Gateway Intents**, enable **Server Members Intent**. This is **mandatory** for the bot to auto-bestow roles to joining users.
   - Save your changes.

### 2. Configure Environment Variables

Add the Bot Token to your `.env` file:

```env
DISCORD_BOT_TOKEN="your_copied_bot_token_here"
```

### 3. Invite the Bot to Your Server

1. Under the **OAuth2** -> **URL Generator** tab:
   - Select the `bot` scope.
   - Select **Bot Permissions**:
     - `Manage Roles` (Required to bestow roles to users)
     - `Send Messages` (Required to post alert announcements)
2. Copy the generated URL at the bottom and navigate to it in a browser.
3. Select your target Discord Server (Guild) and authorize the bot.

### 4. Enable Integration in the Web UI

1. Start the server and navigate to the admin dashboard.
2. Go to **Discord** -> **Settings**.
3. Enter your target **Server Guild ID** (you can get this in Discord by enabling Developer Mode, right-clicking your server icon, and selecting **Copy Server ID**).
4. Toggle **Enable Discord Integration** to **On** and click **Save Settings**.
5. Go to **Discord** -> **Alerts** and **Discord** -> **Role Bestow** to configure respective features.
