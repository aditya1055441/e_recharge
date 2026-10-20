import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { pool } from "../database/connection";
import { transactionDb } from "../database/transaction.db";
import { DemoProvider } from "../providers/demo.provider";
import { createRecharge } from "../services/transaction.service";

const demoProvider = new DemoProvider();

export const createTransaction = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = z.object({
      serviceType: z.enum(["MOBILE", "DTH", "BILL_PAYMENT"]),
      target: z.string().trim().min(2).max(160),
      amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
      providerCode: z.string().default("DEMO")
    }).safeParse(req.body);

    const key = req.header("Idempotency-Key");
    if (!parsed.success || !key || key.length < 8 || key.length > 128) {
      return res.status(400).json({ error: "INVALID_INPUT_OR_IDEMPOTENCY_KEY" });
    }

    if (parsed.data.providerCode !== "DEMO") {
      return res.status(400).json({ error: "PROVIDER_NOT_CONFIGURED", message: "Only DEMO is wired in this scaffold." });
    }

    const result = await createRecharge(pool, demoProvider, {
      userId: req.authUser!.id,
      serviceType: parsed.data.serviceType,
      target: parsed.data.target,
      amount: parsed.data.amount,
      idempotencyKey: key
    });

    return res.status(202).json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "INTERNAL_ERROR";
    if (["INSUFFICIENT_WALLET_BALANCE", "WALLET_NOT_ACTIVE", "INVALID_AMOUNT", "INVALID_TARGET", "INVALID_SERVICE"].includes(message)) {
      return res.status(422).json({ error: message });
    }
    next(e);
  }
};

export const getTransactions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.authUser!;
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
    const transactions = await transactionDb.getVisibleTransactions(user.id, user.role, limit);
    return res.json({ transactions });
  } catch (e) {
    next(e);
  }
};
