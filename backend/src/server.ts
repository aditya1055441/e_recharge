import "dotenv/config";
import { app } from "./app";
import { pool } from "./db/pool";

const port = Number(process.env.PORT ?? 3000);
const server = app.listen(port, () => console.log(`Recharge Panel API listening on http://localhost:${port}`));

async function shutdown() {
  server.close();
  await pool.end();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
