import { Router } from "express";
import { createFundingRequest } from "../controllers/wallet.controller";
import { authenticate } from "../security/auth";

const router = Router();

router.post("/funding-requests", authenticate, createFundingRequest);

export default router;
