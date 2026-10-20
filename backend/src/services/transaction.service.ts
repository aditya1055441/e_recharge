import type { Pool } from "pg";
import type { RechargeProvider, ServiceType } from "../providers/provider.types";
import { debitWalletForRecharge } from "./ledger.service";

const allowedServices: ServiceType[] = ["MOBILE", "DTH", "BILL_PAYMENT"];

export async function createRecharge(
  db: Pool,
  provider: RechargeProvider,
  input: { userId: number; serviceType: ServiceType; target: string; amount: string; idempotencyKey: string }
) {
  if (!allowedServices.includes(input.serviceType)) throw new Error("INVALID_SERVICE");
  if (!/^\d+(\.\d{1,2})?$/.test(input.amount) || Number(input.amount) <= 0 || Number(input.amount) > 100000) {
    throw new Error("INVALID_AMOUNT");
  }
  if (!input.target.trim() || input.target.length > 160) throw new Error("INVALID_TARGET");

  const prior = await db.query(
    "SELECT public_id, status FROM recharge_transactions WHERE client_user_id=$1 AND idempotency_key=$2",
    [input.userId, input.idempotencyKey]
  );
  if (prior.rowCount) return { publicId: prior.rows[0].public_id, status: prior.rows[0].status, duplicate: true };

  const inserted = await db.query(
    `INSERT INTO recharge_transactions
      (client_user_id, service_type, target, amount, idempotency_key, status, request_json)
     VALUES ($1,$2,$3,$4,$5,'PENDING',$6)
     RETURNING id, public_id`,
    [input.userId, input.serviceType, input.target, input.amount, input.idempotencyKey,
      JSON.stringify({ serviceType: input.serviceType, target: input.target, amount: input.amount })]
  );
  const id = Number(inserted.rows[0].id);
  const publicId = String(inserted.rows[0].public_id);

  try {
    await debitWalletForRecharge(db, input.userId, input.amount, publicId, `recharge:${input.userId}:${input.idempotencyKey}`);
  } catch (e) {
    const message = e instanceof Error ? e.message : "WALLET_ERROR";
    await db.query(
      "UPDATE recharge_transactions SET status='FAILED', failure_code=$2, failure_message=$3, updated_at=NOW() WHERE id=$1",
      [id, message, "Could not reserve wallet funds"]
    );
    throw e;
  }

  await db.query("UPDATE recharge_transactions SET status='PROCESSING', updated_at=NOW() WHERE id=$1", [id]);
  const providerRow = await db.query("SELECT id FROM providers WHERE code=$1 AND enabled=TRUE", [provider.code]);
  const providerId = providerRow.rows[0] ? Number(providerRow.rows[0].id) : null;

  try {
    const response = await provider.submitRecharge({
      transactionId: publicId,
      serviceType: input.serviceType,
      target: input.target,
      amount: input.amount,
      idempotencyKey: input.idempotencyKey
    });
    const status = response.status === "SUCCESS" ? "SUCCESS"
      : response.status === "FAILED" ? "FAILED"
      : response.status === "PENDING" ? "PROCESSING" : "UNKNOWN";
    await db.query(
      `UPDATE recharge_transactions
       SET provider_id=$2, provider_reference=$3, status=$4,
           failure_code=$5, failure_message=$6, response_json=$7, updated_at=NOW()
       WHERE id=$1`,
      [id, providerId, response.providerReference ?? null, status,
        response.status === "FAILED" ? response.code ?? "PROVIDER_FAILED" : null,
        response.message ?? null, JSON.stringify(response.raw ?? {})]
    );
    if (status === "SUCCESS" || status === "FAILED" || status === "UNKNOWN") {
      await db.query(
        `INSERT INTO notifications(user_id,type,message,transaction_id)
         VALUES($1,$2,$3,$4)`,
        [input.userId, status, `Recharge ${publicId}: ${status}`, id]
      );
    }
    // IMPORTANT: failed/unknown transactions remain financially reserved here.
    // Implement reviewed reversal/release logic after confirmed provider failure;
    // do not release on timeout/unknown.
    return { publicId, status, duplicate: false };
  } catch (error) {
    await db.query(
      `UPDATE recharge_transactions
       SET status='UNKNOWN', failure_code='PROVIDER_EXCEPTION',
           failure_message='Provider outcome unknown; reconciliation required',
           updated_at=NOW()
       WHERE id=$1`,
      [id]
    );
    await db.query(
      `INSERT INTO notifications(user_id,type,message,transaction_id)
       VALUES($1,'UNKNOWN',$2,$3)`,
      [input.userId, `Recharge ${publicId} needs status reconciliation`, id]
    );
    return { publicId, status: "UNKNOWN", duplicate: false };
  }
}
