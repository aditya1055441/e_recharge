import type { Pool, PoolClient } from "pg";

/**
 * Creates a balanced wallet debit and clearing credit.
 * Production chart-of-accounts, provider settlement, commission and refund accounting
 * must be reviewed and extended before real money is used.
 */
export async function debitWalletForRecharge(
  db: Pool,
  userId: number,
  amount: string,
  transactionRef: string,
  idempotencyKey: string
) {
  const client: PoolClient = await db.connect();
  try {
    await client.query("BEGIN");
    const wallet = await client.query(
      `SELECT id, ledger_account_id, status FROM wallet_accounts
       WHERE owner_user_id=$1 AND currency='INR'
       FOR UPDATE`,
      [userId]
    );
    if (!wallet.rows[0] || wallet.rows[0].status !== "ACTIVE") {
      throw new Error("WALLET_NOT_ACTIVE");
    }
    const accountId = Number(wallet.rows[0].ledger_account_id);
    const existing = await client.query(
      "SELECT id FROM wallet_journals WHERE idempotency_key=$1",
      [idempotencyKey]
    );
    if (existing.rowCount) {
      await client.query("ROLLBACK");
      return { duplicate: true };
    }
    const bal = await client.query(
      `SELECT COALESCE(SUM(amount),0)::numeric AS balance
       FROM wallet_entries WHERE account_id=$1`,
      [accountId]
    );
    const current = Number(bal.rows[0].balance);
    const requested = Number(amount);
    if (!Number.isFinite(requested) || requested <= 0) throw new Error("INVALID_AMOUNT");
    if (current < requested) throw new Error("INSUFFICIENT_WALLET_BALANCE");

    const journal = await client.query(
      `INSERT INTO wallet_journals(transaction_ref,idempotency_key,entry_type,description)
       VALUES($1,$2,'RECHARGE_DEBIT','Recharge wallet debit')
       RETURNING id`,
      [transactionRef, idempotencyKey]
    );
    const journalId = journal.rows[0].id;
    const clearing = await client.query("SELECT ledger_account_id AS id FROM system_accounts WHERE code='RECHARGE_CLEARING'");
    const clearingAccountId = Number(clearing.rows[0].id);

    // Wallet is a positive-balance account; debit is negative. Clearing receives the offset.
    await client.query(
      "INSERT INTO wallet_entries(journal_id,account_id,amount) VALUES($1,$2,$3),($1,$4,$5)",
      [journalId, accountId, (-requested).toFixed(2), clearingAccountId, requested.toFixed(2)]
    );
    const sum = await client.query(
      "SELECT COALESCE(SUM(amount),0)::numeric AS total FROM wallet_entries WHERE journal_id=$1",
      [journalId]
    );
    if (Number(sum.rows[0].total) !== 0) throw new Error("UNBALANCED_JOURNAL");
    await client.query("COMMIT");
    return { duplicate: false };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
