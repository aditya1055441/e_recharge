import { Router } from "express";
import authRoutes from "./auth.routes";
import dashboardRoutes from "./dashboard.routes";
import transactionRoutes from "./transaction.routes";
import providerRoutes from "./provider.routes";
import walletRoutes from "./wallet.routes";
import adminRoutes from "./admin.routes";
import notificationRoutes from "./notification.routes";
import paymentRoutes from "./payment.routes";
import planRoutes from "./plan.routes";
import { getUserHierarchy } from "../controllers/admin.controller";
import { getCurrentUser } from "../controllers/auth.controller";
import { authenticate } from "../security/auth";

const router = Router();

router.use("/auth", authRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/transactions", transactionRoutes);
router.use("/providers", providerRoutes);
router.use("/wallet", walletRoutes);
router.use("/admin", adminRoutes);
router.use("/notifications", notificationRoutes);
router.use("/payments", paymentRoutes);
router.use("/plans", planRoutes);

// Direct hierarchy lookup path /api/v1/hierarchy/:userId for backwards compatibility
router.get("/hierarchy/:userId", authenticate, getUserHierarchy);

// Profile shortcut /api/v1/me for backwards compatibility
router.get("/me", authenticate, getCurrentUser);

export default router;
