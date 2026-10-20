import { Request, Response, NextFunction } from "express";
import { pool } from "../database/connection";
import { adminDb } from "../database/admin.db";
import { canAccessUser } from "../security/hierarchy";

export const getUserHierarchy = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const targetId = Number(req.params.userId);
    if (!Number.isSafeInteger(targetId) || targetId <= 0) {
      return res.status(400).json({ error: "INVALID_USER_ID" });
    }

    if (!(await canAccessUser(pool, req.authUser!, targetId))) {
      return res.status(403).json({ error: "FORBIDDEN" });
    }

    const user = await adminDb.getUserById(targetId);
    if (!user) {
      return res.status(404).json({ error: "NOT_FOUND" });
    }

    return res.json({ user });
  } catch (e) {
    next(e);
  }
};

export const getAllUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.authUser!;
    const users = await adminDb.getSubordinateUsers(user.id, user.role);
    return res.json({ users });
  } catch (e) {
    next(e);
  }
};

export const getSystemAudit = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const audit = await adminDb.getSystemAuditMetrics();
    return res.json({
      success: true,
      audit
    });
  } catch (e) {
    next(e);
  }
};
