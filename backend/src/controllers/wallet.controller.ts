import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { walletDb } from "../database/wallet.db";

export const createFundingRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = z.object({
      amount: z.string().regex(/^\d+(\.\d{1,2})?$/)
    }).safeParse(req.body);

    if (!parsed.success || Number(parsed.data.amount) <= 0 || Number(parsed.data.amount) > 100000) {
      return res.status(400).json({ error: "INVALID_AMOUNT" });
    }

    const fundingRequest = await walletDb.createFundingRequest(req.authUser!.id, parsed.data.amount);

    return res.status(201).json({
      fundingRequest,
      message: "Request recorded only. Wallet not credited; verified payment integration is required."
    });
  } catch (e) {
    next(e);
  }
};
