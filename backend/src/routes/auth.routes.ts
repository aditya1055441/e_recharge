import { Router } from "express";
import {
  login,
  googleLogin,
  getCurrentUser,
  sendRegistrationCode,
  verifyRegistrationCode,
  completeRegistration
} from "../controllers/auth.controller";
import { authenticate } from "../security/auth";

const router = Router();

router.post("/login", login);
router.post("/google", googleLogin);
router.get("/me", authenticate, getCurrentUser);

// Registration & Verification routes
router.post("/register/send-code", sendRegistrationCode);
router.post("/register/verify-code", verifyRegistrationCode);
router.post("/register/complete", completeRegistration);

export default router;
