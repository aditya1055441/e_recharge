import { Request, Response, NextFunction } from "express";
import { notificationDb } from "../database/notification.db";

export const getNotifications = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const notifications = await notificationDb.getUserNotifications(req.authUser!.id);
    return res.json({ notifications });
  } catch (e) {
    next(e);
  }
};

export const markNotificationRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const success = await notificationDb.markAsRead(Number(req.params.id), req.authUser!.id);
    if (!success) {
      return res.status(404).json({ error: "NOT_FOUND" });
    }
    return res.json({ success: true });
  } catch (e) {
    next(e);
  }
};
