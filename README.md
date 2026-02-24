# db-mysql — OpenClaw plugin for any MySQL/MariaDB

Plugin for [OpenClaw](https://docs.openclaw.ai) that connects to **any** MySQL or MariaDB database and gives the agent two read-only tools: **`db_query`** (run SELECT) and **`db_schema`** (list tables and columns). Use it on any machine, with any database and any OpenClaw-compatible model (local or API/token).

---

## What you get

| Tool        | Description |
|------------|-------------|
| **db_query**  | Run a read-only SQL `SELECT` query. INSERT/UPDATE/DELETE and DDL are blocked. |
| **db_schema** | Return all tables and their columns in the current database (for the agent to plan queries). |

The database is configured via environment variables (or a `.env` file). No code changes needed when you switch databases or deploy elsewhere.

---

## 1. Install the plugin

Use one of these.

### A. From a folder (e.g. clone or copy)

```bash
cd /path/to/db-logistic   # or wherever you put the plugin
npm install
```

Then point OpenClaw at this folder in config (see [§3](#3-openclaw-config)).

### B. Install into OpenClaw extensions (recommended for “use anywhere”)

```bash
openclaw plugins install /path/to/db-logistic
```

This copies the plugin to `~/.openclaw/extensions/db-mysql`. Restart the gateway after install.

### C. Load by path in config

In `openclaw.json` set:

```json
"plugins": {
  "load": { "paths": ["/path/to/db-logistic"] },
  "entries": { "db-mysql": { "enabled": true } }
}
```

Again, run `npm install` inside that folder first.

---

## 2. Database configuration (any database)

Connection is controlled by environment variables. Set them in a **`.env` file** or in the process environment (e.g. systemd `EnvironmentFile` or `Environment`).

### Required variables

| Variable     | Meaning           | Example        |
|-------------|-------------------|----------------|
| **DB_HOST** | MySQL host        | `localhost`    |
| **DB_PORT** | Port (optional)   | `3306`         |
| **DB_USER** | MySQL user        | `appuser`      |
| **DB_PASSWORD** | Password     | `secret`       |
| **DB_NAME** | Database name     | `myapp`        |

### Where to put `.env`

- **Next to your app/project**  
  e.g. `/opt/myapp/.env` or `~/projects/myapp/.env`.  
  The plugin looks for `.env` in the plugin’s parent directories and in `process.cwd()`, so placing it at project root usually works.

- **Explicit path in OpenClaw config**  
  In `openclaw.json`:

  ```json
  "plugins": {
    "entries": {
      "db-mysql": {
        "enabled": true,
        "config": { "envPath": "/opt/myapp/.env" }
      }
    }
  }
  ```

  Then the plugin loads that file and reads `DB_*` from it. Use this when OpenClaw runs from another directory (e.g. systemd).

### Example `.env`

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=myuser
DB_PASSWORD=mysecret
DB_NAME=mydatabase
```

Use a **read-only** MySQL user for safety; the plugin only allows `SELECT`.

---

## 3. OpenClaw config

### Load and enable the plugin

In `~/.openclaw/openclaw.json` (or your config file):

```json
{
  "plugins": {
    "load": { "paths": ["/path/to/db-logistic"] },
    "entries": {
      "db-mysql": { "enabled": true }
    }
  }
}
```

If you used `openclaw plugins install`, you may only need:

```json
"plugins": {
  "entries": {
    "db-mysql": { "enabled": true }
  }
}
```

### Let the agent use the tools

Give the agent access to the DB tools. For example, for agent `main`:

```json
"agents": {
  "list": [
    {
      "id": "main",
      "tools": { "alsoAllow": ["db_query", "db_schema"] }
    }
  ]
}
```

Restart the OpenClaw gateway after changing config.

---

## 4. Recommended models (local and token)

Use any OpenClaw-compatible model. For **SQL and tool use** (calling `db_query` / `db_schema` and reasoning over results), these are good options.

### Local (no API token)

| Model / stack | Notes |
|---------------|--------|
| **Ollama: Qwen2.5 / Qwen3** (e.g. 32B) | Strong tool use and reasoning; good for DB tasks. |
| **Ollama: Llama 3.1** (8B–70B) | General purpose; larger sizes better for multi-step SQL. |
| **Ollama: Mixtral** (8x7B) | Good balance of speed and quality. |
| **LM Studio: MiniMax M2.1** | Often recommended for OpenClaw agent work (large context). |

Configure local models in OpenClaw under `agents.defaults.models` and set your preferred model as primary. Point OpenClaw at Ollama/LM Studio according to [OpenClaw local models](https://docs.openclaw.ai/gateway/local-models).

### Token / API (OpenAI, etc.)

| Model | Notes |
|-------|--------|
| **OpenAI: gpt-4o / gpt-4o-mini** | Very good at SQL and tool use. |
| **OpenAI: gpt-4.1 / gpt-5.x** | If available in your OpenClaw config. |
| **Anthropic: Claude 3.5 Sonnet / Opus** | Strong reasoning and tool use. |

Set your API keys via `openclaw onboard` or the relevant OpenClaw provider config. Use the same `agents.list[].tools.alsoAllow` so the model can call `db_query` and `db_schema`.

### Practical tip

- **Local:** Prefer at least 32B-parameter models (or MoE like Mixtral) for reliable tool use; 7B is often too weak for complex SQL.
- **Token:** GPT-4o or Claude 3.5 are safe defaults for “any database” + OpenClaw anywhere.

---

## 5. Quick check

1. **Env:** `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` (and optional `DB_PORT`) in `.env` or environment.
2. **OpenClaw:** Plugin loaded and `db-mysql` enabled; agent has `tools.alsoAllow: ["db_query", "db_schema"]`.
3. **Restart** the gateway, then in chat ask the agent to “list tables” or “run a simple SELECT” — it should use `db_schema` and then `db_query`.

If the plugin fails with “DB_NAME is not set”, add `DB_NAME` to your `.env` or set `envPath` in `plugins.entries["db-mysql"].config` to the correct `.env` path.

---

## License

Same as the project that ships this plugin.
