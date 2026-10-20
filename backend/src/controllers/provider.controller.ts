import { Request, Response, NextFunction } from "express";
import { providerDb } from "../database/provider.db";

export const getProviders = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const providers = await providerDb.getAll();
    return res.json({ providers });
  } catch (e) {
    next(e);
  }
};
