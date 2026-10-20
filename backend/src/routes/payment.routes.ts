import { Router } from "express";
import {
  getRazorpayConfig,
  createRazorpayOrder,
  verifyAndProcessCardRecharge
} from "../controllers/payment.controller";
import { authenticate } from "../security/auth";

const router = Router();

router.get("/razorpay/config", getRazorpayConfig);
router.post("/razorpay/create-order", authenticate, createRazorpayOrder);
router.post("/razorpay/verify-recharge", authenticate, verifyAndProcessCardRecharge);

export default router;
