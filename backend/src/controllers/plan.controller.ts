import { Request, Response, NextFunction } from "express";
import { selectedProvider } from "../providers/selected-provider";

export const getMobilePlans = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const operator = String(req.query.operator || req.query.operatorCode || "JIO");
    const circle = String(req.query.circle || req.query.circleCode || "DELHI");

    const plans = await selectedProvider.getMobilePlans(operator, circle);

    return res.json({
      success: true,
      operator,
      circle,
      count: plans.length,
      plans
    });
  } catch (err: any) {
    next(err);
  }
};

export const getDthPlans = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const operator = String(req.query.operator || req.query.operatorCode || "TATAPLAY");
    const subscriberId = req.query.subscriberId ? String(req.query.subscriberId) : undefined;

    const plans = await selectedProvider.getDthPlans(operator, subscriberId);

    return res.json({
      success: true,
      operator,
      subscriberId,
      count: plans.length,
      plans
    });
  } catch (err: any) {
    next(err);
  }
};
