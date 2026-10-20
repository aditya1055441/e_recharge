import { Router } from "express";
import { login, googleLogin, getCurrentUser } from "../controllers/auth.controller";
import { authenticate } from "../security/auth";

const router = Router();

router.post("/login", login);
router.post("/google", googleLogin);
router.get("/me", authenticate, getCurrentUser);

export default router;
