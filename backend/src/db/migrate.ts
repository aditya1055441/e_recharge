import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { pool } from "./pool";

async function main() {
  const migrationsDir = path.join(__dirname, "migrations");
  const files = fs.readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);

    for (const file of files) {
      const version = path.parse(file).name;
      const existing = await client.query(
        "SELECT version FROM schema_migrations WHERE version = $1",
        [version]
      );

      if ((existing.rowCount ?? 0) === 0) {
        const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
        await client.query(sql);
        await client.query(
          "INSERT INTO schema_migrations(version) VALUES ($1)",
          [version]
        );
        console.log(`Applied migration ${version}`);
      } else {
        console.log(`Migration ${version} already applied`);
      }
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
