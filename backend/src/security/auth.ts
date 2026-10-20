import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export type Role = "ADMIN" | "API_MANAGER" | "MASTER_DISTRIBUTOR" | "DISTRIBUTOR" | "RETAILER";
export interface AuthUser { id: number; email: string; role: Role; parentUserId: number | null; }
declare global {
  namespace Express { interface Request { authUser?: AuthUser; } }
}
function secret() {
  const value = process.env.JWT_SECRET;
  if (!value || value.length < 32) throw new Error("JWT_SECRET must be at least 32 characters");
  return value;
}
export function signToken(user: AuthUser) {
  return jwt.sign(
    { sub: String(user.id), email: user.email, role: user.role, parentUserId: user.parentUserId },
    secret(),
    { expiresIn: "30m", issuer: "recharge-panel-local" }
  );
}
export function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.header("authorization");
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "AUTH_REQUIRED" }); return;
  }
  try {
    const payload = jwt.verify(header.slice(7), secret(), { issuer: "recharge-panel-local" }) as jwt.JwtPayload;
    req.authUser = {
      id: Number(payload.sub),
      email: String(payload.email),
      role: payload.role as Role,
      parentUserId: payload.parentUserId == null ? null : Number(payload.parentUserId)
    };
    next();
  } catch {
    res.status(401).json({ error: "INVALID_OR_EXPIRED_TOKEN" });
  }
}
export function allowRoles(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.authUser || !roles.includes(req.authUser.role)) {
      res.status(403).json({ error: "FORBIDDEN" }); return;
    }
    next();
  };
}
