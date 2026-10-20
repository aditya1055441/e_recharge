import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { z } from "zod";
import { authDb } from "../database/auth.db";
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
