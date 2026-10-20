import { Router } from "express";
import { getProviders } from "../controllers/provider.controller";
import { authenticate, allowRoles } from "../security/auth";

const router = Router();

router.get(
  "/",
  authenticate,
  allowRoles("ADMIN", "API_MANAGER"),
  getProviders
);

export default router;
