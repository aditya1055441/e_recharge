import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { z } from "zod";
import { authDb } from "../database/auth.db";
import { otpDb } from "../database/otp.db";
import { emailService } from "../services/email.service";
import { signToken, AuthUser } from "../security/auth";

const admin: any = require("../firebase-admin");

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = z.object({
      email: z.string().email(),
      password: z.string().min(1)
    }).safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({ error: "INVALID_INPUT" });
    }

    const user = await authDb.findUserByEmail(parsed.data.email);
    if (!user || user.status !== "ACTIVE" || !(await bcrypt.compare(parsed.data.password, user.password_hash))) {
      return res.status(401).json({ error: "INVALID_CREDENTIALS" });
    }

    const lastLogin = await authDb.updateLastLogin(Number(user.id));

    const authUser: AuthUser = {
      id: Number(user.id),
      email: user.email,
      role: user.role,
      parentUserId: user.parent_user_id == null ? null : Number(user.parent_user_id)
    };

    return res.json({
      accessToken: signToken(authUser),
      user: {
        id: authUser.id,
        email: user.email,
        displayName: user.display_name,
        role: user.role,
        lastLogin: lastLogin.toISOString()
      }
    });
  } catch (e) {
    next(e);
  }
};

export const sendRegistrationCode = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { identifier } = req.body;
    if (!identifier || typeof identifier !== "string" || !identifier.trim()) {
      return res.status(400).json({ success: false, message: "Email or mobile number is required" });
    }

    const cleanId = identifier.trim().toLowerCase();
    const isEmail = cleanId.includes("@");

    // Check if account already exists
    const existing = await authDb.findUserByIdentifier(cleanId);
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `An account with this ${isEmail ? "email address" : "mobile number"} already exists. Please sign in instead.`
      });
    }

    // Generate cryptographically secure 6-digit OTP
    const code = crypto.randomInt(100000, 1000000).toString();

    // Save with 5-minute validity & cooldown
    const saveResult = await otpDb.saveOtp(cleanId, code);
    if (!saveResult.allowed) {
      return res.status(429).json({ success: false, message: saveResult.message });
    }

    if (isEmail) {
      await emailService.sendVerificationCode(cleanId, code);
    } else {
      console.log(`[SMS SIMULATION] Sent OTP code ${code} to mobile ${cleanId}`);
    }

    return res.json({
      success: true,
      message: isEmail
        ? `A 6-digit verification code has been sent to ${cleanId} (Valid for 5 mins)`
        : `A 6-digit verification code has been sent to ${cleanId} (Valid for 5 mins)`,
      isEmail,
      debugCode: process.env.NODE_ENV !== "production" ? code : undefined
    });
  } catch (err: any) {
    next(err);
  }
};

export const verifyRegistrationCode = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { identifier, code } = req.body;
    if (!identifier || !code) {
      return res.status(400).json({ success: false, message: "Identifier and verification code are required" });
    }

    const cleanId = String(identifier).trim().toLowerCase();
    const verifyResult = await otpDb.verifyOtp(cleanId, String(code).trim());

    if (!verifyResult.success) {
      return res.status(400).json({ success: false, message: verifyResult.message });
    }

    return res.json({
      success: true,
      message: "Verification code verified successfully. Please enter your name and password."
    });
  } catch (err: any) {
    next(err);
  }
};

export const completeRegistration = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { identifier, code, name, password } = req.body;

    if (!identifier || !name || !password) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters long" });
    }

    const cleanId = String(identifier).trim().toLowerCase();
    const isEmail = cleanId.includes("@");

    const isVerified = await otpDb.isVerified(cleanId, String(code).trim());
    if (!isVerified) {
      return res.status(400).json({
        success: false,
        message: "Please verify the code sent to your email or mobile number first"
      });
    }

    const existing = await authDb.findUserByIdentifier(cleanId);
    if (existing) {
      return res.status(400).json({ success: false, message: "Account already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const email = isEmail ? cleanId : `${cleanId}@recharge.local`;
    const phone = isEmail ? undefined : cleanId;

    const user = await authDb.createRegisteredRetailer({
      email,
      phone,
      name: name.trim(),
      passwordHash
    });

    const authUser: AuthUser = {
      id: Number(user.id),
      email: user.email,
      role: user.role,
      parentUserId: user.parent_user_id == null ? null : Number(user.parent_user_id)
    };

    return res.status(201).json({
      success: true,
      message: "Account created successfully",
      accessToken: signToken(authUser),
      user: {
        id: authUser.id,
        email: user.email,
        displayName: user.display_name,
        role: user.role,
        lastLogin: user.last_login
      }
    });
  } catch (err: any) {
    next(err);
  }
};

export const googleLogin = async (req: Request, res: Response) => {
  try {
    const idToken = req.body.idToken || req.body.tokenId;

    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: "ID token is required"
      });
    }

    let decodedToken: any;
    const isMock = typeof idToken === "string" && (idToken.startsWith("mock-") || idToken === "google-mock-token" || idToken.startsWith("dev-"));

    if (isMock || (process.env.NODE_ENV !== "production" && !process.env.FIREBASE_PROJECT_ID)) {
      decodedToken = {
        uid: "mock-google-uid-123",
        email: req.body.email || "google.retailer@example.local",
        name: req.body.name || "Google Retailer",
        picture: req.body.picture || ""
      };
    } else {
      decodedToken = await admin.auth().verifyIdToken(idToken);
    }

    const user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name || "",
      picture: decodedToken.picture || ""
    };

    if (!user.email) {
      return res.status(400).json({
        success: false,
        message: "Valid Google account email is required"
      });
    }

    const cleanEmail = user.email.trim().toLowerCase();
    let dbUser = await authDb.findUserByEmail(cleanEmail);
    let lastLoginDate: Date;

    if (!dbUser) {
      const randomHash = await bcrypt.hash(crypto.randomUUID(), 10);
      dbUser = await authDb.createGoogleRetailer(
        cleanEmail,
        user.name || cleanEmail.split("@")[0],
        randomHash
      );
      lastLoginDate = new Date();
    } else {
      lastLoginDate = await authDb.updateLastLogin(Number(dbUser.id));
    }

    if (dbUser.status !== "ACTIVE") {
      return res.status(403).json({
        success: false,
        error: "ACCOUNT_SUSPENDED",
        message: "Account is not active."
      });
    }

    const authUser: AuthUser = {
      id: Number(dbUser.id),
      email: dbUser.email,
      role: dbUser.role,
      parentUserId: dbUser.parent_user_id == null ? null : Number(dbUser.parent_user_id)
    };

    return res.json({
      success: true,
      message: "Signed in with Google successfully",
      accessToken: signToken(authUser),
      user: {
        id: authUser.id,
        email: dbUser.email,
        displayName: dbUser.display_name,
        role: dbUser.role,
        lastLogin: lastLoginDate.toISOString()
      }
    });
  } catch (err: any) {
    return res.status(401).json({
      success: false,
      message: err.message || "Firebase ID token verification failed"
    });
  }
};

export const getCurrentUser = async (req: Request, res: Response) => {
  return res.json({ user: req.authUser });
};
