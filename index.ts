import * as path from "path";
import { createPool, type Pool } from "mysql2/promise";
import dotenv from "dotenv";
import { existsSync } from "fs";

type Api = {
  registerTool: (opts: unknown, extra?: { optional?: boolean }) => void;
  config?: {
    plugins?: { entries?: Record<string, { config?: { envPath?: string } }> };
  };
};

function loadEnv(api: Api): void {
  const cfg = api?.config?.plugins?.entries?.["db-mysql"]?.config;
  if (cfg?.envPath && existsSync(cfg.envPath)) {
    dotenv.config({ path: cfg.envPath });
    return;
  }
  const envPaths = [
    path.join(__dirname, "..", "..", ".env"),
    path.join(__dirname, "..", "..", "..", ".env"),
    path.join(process.cwd(), ".env"),
  ];
  for (const p of envPaths) {
    if (existsSync(p)) {
      dotenv.config({ path: p });
      return;
    }
  }
}

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    const database = process.env.DB_NAME ?? "";
    if (!database) {
      throw new Error(
        "DB_NAME is not set. Add DB_NAME to your .env or environment (see README.md)."
      );
    }
    pool = createPool({
      host: process.env.DB_HOST || "localhost",
      port: parseInt(process.env.DB_PORT || "3306", 10),
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD ?? "",
      database,
      waitForConnections: true,
      connectionLimit: 100,
      queueLimit: 0,
    });
  }
  return pool;
}

function isReadOnly(sql: string): boolean {
  const trimmed = sql.trim().toUpperCase();
  if (!trimmed.startsWith("SELECT")) return false;
  const forbidden = ["INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "CREATE", "TRUNCATE", "REPLACE"];
  for (const word of forbidden) {
    if (trimmed.includes(word)) return false;
  }
  return true;
}

export default function (api: Api) {
  loadEnv(api);

  api.registerTool(
    {
      name: "db_query",
      description:
        "Execute a read-only SQL SELECT query against the configured MySQL/MariaDB database. Use for retrieving data only. Never use for INSERT, UPDATE, DELETE, or schema changes.",
      parameters: {
        type: "object",
        properties: {
          sql: {
            type: "string",
            description: "The SQL SELECT query to execute",
          },
        },
        required: ["sql"],
      },
      async execute(_id: string, params: { sql: string }) {
        if (!isReadOnly(params.sql)) {
          return {
            content: [{ type: "text", text: "Error: Only SELECT queries are allowed." }],
          };
        }
        try {
          const p = getPool();
          const [rows] = await p.execute(params.sql);
          const text = JSON.stringify(rows, null, 2);
          return { content: [{ type: "text", text }] };
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          return { content: [{ type: "text", text: `Database error: ${msg}` }] };
        }
      },
    },
    { optional: true }
  );

  api.registerTool(
    {
      name: "db_schema",
      description:
        "Get the list of tables and their columns in the configured database. Use this to understand the schema before writing SQL queries.",
      parameters: {
        type: "object",
        properties: {},
      },
      async execute() {
        try {
          const p = getPool();
          const [tables] = await p.execute("SHOW TABLES");
          const tableNames = (tables as { [key: string]: string }[]).map((r) => Object.values(r)[0]);
          const schema: Record<string, string[]> = {};
          for (const table of tableNames) {
            const [cols] = await p.execute(`DESCRIBE \`${table}\``);
            schema[table] = (cols as { Field: string }[]).map((c) => c.Field);
          }
          const text = JSON.stringify(schema, null, 2);
          return { content: [{ type: "text", text }] };
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          return { content: [{ type: "text", text: `Database error: ${msg}` }] };
        }
      },
    },
    { optional: true }
  );
}
