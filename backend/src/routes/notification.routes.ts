import { Router } from "express";
import { getNotifications, markNotificationRead } from "../controllers/notification.controller";
import { authenticate } from "../security/auth";

const router = Router();

router.get("/", authenticate, getNotifications);
router.patch("/:id/read", authenticate, markNotificationRead);

export default router;
