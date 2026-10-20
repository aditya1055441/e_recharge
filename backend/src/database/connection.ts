import "dotenv/config";
import { Pool } from "pg";

const connectionString =
  process.env.DATABASE_URL ??
  "postgres://recharge_app:local_dev_only_change_me@localhost:5432/recharge_panel";

export const pool = new Pool({ connectionString });

export class DatabaseConnection {
  private poolInstance: Pool = pool;

  public getPool(): Pool {
    return this.poolInstance;
  }

  public async query(text: string, params?: any[]) {
    return this.poolInstance.query(text, params);
  }

  public async close(): Promise<void> {
    await this.poolInstance.end();
  }
}

export const dbConnection = new DatabaseConnection();
