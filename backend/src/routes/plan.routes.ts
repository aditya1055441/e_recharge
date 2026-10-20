import { Router } from "express";
import { getMobilePlans, getDthPlans } from "../controllers/plan.controller";
import { authenticate } from "../security/auth";

const router = Router();

// Allow authenticated users to fetch plans
router.get("/mobile", authenticate, getMobilePlans);
router.get("/dth", authenticate, getDthPlans);

export default router;
