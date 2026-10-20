import { Router } from "express";
import { getUserHierarchy, getAllUsers, getSystemAudit } from "../controllers/admin.controller";
import { authenticate, allowRoles } from "../security/auth";

const router = Router();

// Hierarchy lookup (accessible by Admin, Master Distributor, Distributor for their descendants)
router.get("/hierarchy/:userId", authenticate, getUserHierarchy);

// User management (Admin, Master Distributor, Distributor)
router.get("/users", authenticate, allowRoles("ADMIN", "MASTER_DISTRIBUTOR", "DISTRIBUTOR"), getAllUsers);

// System Audit (Admin only)
router.get("/audit", authenticate, allowRoles("ADMIN"), getSystemAudit);

export default router;
