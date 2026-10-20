import { Router } from "express";
import { createTransaction, getTransactions } from "../controllers/transaction.controller";
import { authenticate, allowRoles } from "../security/auth";

const router = Router();

router.post(
  "/",
  authenticate,
  allowRoles("RETAILER", "DISTRIBUTOR", "MASTER_DISTRIBUTOR", "ADMIN"),
  createTransaction
);

router.get("/", authenticate, getTransactions);

export default router;
