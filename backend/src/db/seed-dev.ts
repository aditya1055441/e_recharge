import "dotenv/config";
import bcrypt from "bcryptjs";
import { pool } from "./pool";

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Development seed is disabled in production");
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const roles = [
      { email: "admin@example.local", name: "Demo Admin", role: "ADMIN", parent: null },
      { email: "api-manager@example.local", name: "Demo API Manager", role: "API_MANAGER", parent: null },
      { email: "master@example.local", name: "Demo Master Distributor", role: "MASTER_DISTRIBUTOR", parent: null },
      { email: "distributor@example.local", name: "Demo Distributor", role: "DISTRIBUTOR", parent: "master@example.local" },
      { email: "retailer@example.local", name: "Demo Retailer", role: "RETAILER", parent: "distributor@example.local" }
    ];
    const hash = await bcrypt.hash("ChangeMe123!", 12);
    for (const u of roles) {
      let parentId: number | null = null;
      if (u.parent) {
        const p = await client.query("SELECT id FROM users WHERE email=$1", [u.parent]);
        parentId = p.rows[0]?.id ?? null;
      }
      await client.query(
        `INSERT INTO users(email,password_hash,display_name,role,parent_user_id)
         VALUES($1,$2,$3,$4,$5)
         ON CONFLICT(email) DO NOTHING`,
        [u.email, hash, u.name, u.role, parentId]
      );
    }
    const users = await client.query("SELECT id FROM users");
    for (const u of users.rows) {
      const ledger = await client.query(
        `INSERT INTO ledger_accounts(owner_user_id,account_type,currency)
         VALUES($1,'USER_WALLET','INR')
         ON CONFLICT DO NOTHING RETURNING id`,
        [u.id]
      );
      let ledgerId = ledger.rows[0]?.id;
      if (!ledgerId) {
        const existing = await client.query(
          "SELECT id FROM ledger_accounts WHERE owner_user_id=$1 AND account_type='USER_WALLET' AND currency='INR'",
          [u.id]
        );
        ledgerId = existing.rows[0].id;
      }
      await client.query(
        `INSERT INTO wallet_accounts(owner_user_id,ledger_account_id)
         VALUES($1,$2) ON CONFLICT(owner_user_id,currency) DO NOTHING`,
        [u.id, ledgerId]
      );
    }
    const clearing = await client.query(
      `INSERT INTO ledger_accounts(code,account_type,currency)
       VALUES('RECHARGE_CLEARING','CLEARING','INR')
       ON CONFLICT(code) DO UPDATE SET code=EXCLUDED.code
       RETURNING id`
    );
    await client.query(
      `INSERT INTO system_accounts(code,name,ledger_account_id)
       VALUES('RECHARGE_CLEARING','Recharge clearing',$1)
       ON CONFLICT(code) DO NOTHING`,
      [clearing.rows[0].id]
    );
    await client.query(
      `INSERT INTO providers(code,display_name,enabled,environment,priority,supported_services,health_status)
       VALUES('DEMO','Deterministic Demo Provider',TRUE,'SANDBOX',1,ARRAY['MOBILE','DTH','BILL_PAYMENT'],'HEALTHY')
       ON CONFLICT(code) DO NOTHING`
    );

    // Fictional local-only demo funds. This is not a real payment or production funding method.
    const retailer = await client.query("SELECT id FROM users WHERE email='retailer@example.local'");
    if (retailer.rows[0]) {
      const wallet = await client.query(
        "SELECT ledger_account_id FROM wallet_accounts WHERE owner_user_id=$1 AND currency='INR'",
        [retailer.rows[0].id]
      );
      const journal = await client.query(
        `INSERT INTO wallet_journals(idempotency_key,entry_type,description)
         VALUES('seed:demo-retailer-wallet-v1','DEMO_FUNDING','Fictional local demo funds')
         ON CONFLICT(idempotency_key) DO NOTHING RETURNING id`,
        []
      );
      if (journal.rows[0]) {
        const clearingAccount = await client.query(
          "SELECT ledger_account_id FROM system_accounts WHERE code='RECHARGE_CLEARING'"
        );
        await client.query(
          "INSERT INTO wallet_entries(journal_id,account_id,amount) VALUES($1,$2,5000.00),($1,$3,-5000.00)",
          [journal.rows[0].id, wallet.rows[0].ledger_account_id, clearingAccount.rows[0].ledger_account_id]
        );
      }
    }
    await client.query("COMMIT");
    console.log("Seeded local demo users. Password for all: ChangeMe123!");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
