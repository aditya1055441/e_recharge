import { Request, Response, NextFunction } from "express";
import { dashboardDb } from "../database/dashboard.db";

export const getDashboardStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.authUser!;
    const totals = await dashboardDb.getTotals(user.id, user.role);
    return res.json({ role: user.role, totals });
  } catch (e) {
    next(e);
  }
};
