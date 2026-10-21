import crypto from "node:crypto";
import { prisma } from "./prisma";

export class OtpDatabase {
  private hashOtp(code: string): string {
    const salt = process.env.JWT_SECRET || "recharge-default-otp-salt";
    return crypto.createHash("sha256").update(code.trim() + salt).digest("hex");
  }

  public async saveOtp(
    identifier: string,
    rawCode: string
  ): Promise<{ allowed: boolean; message?: string }> {
    const cleanId = identifier.trim().toLowerCase();
    const otpHash = this.hashOtp(rawCode);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes validity

    // Check recent OTP to enforce 30s cooldown
    const recent = await prisma.verificationOtp.findFirst({
      where: { identifier: cleanId },
      orderBy: { createdAt: "desc" }
    });

    if (recent) {
      const timeSince = now.getTime() - recent.createdAt.getTime();
      if (timeSince < 30 * 1000) {
        const wait = Math.ceil((30 * 1000 - timeSince) / 1000);
        return {
          allowed: false,
          message: `Please wait ${wait} seconds before requesting a new code.`
        };
      }
    }

    await prisma.verificationOtp.create({
      data: {
        identifier: cleanId,
        otpHash,
        attempts: 0,
        verified: false,
        expiresAt
      }
    });

    return { allowed: true };
  }

  public async verifyOtp(
    identifier: string,
    rawCode: string
  ): Promise<{ success: boolean; message?: string }> {
    const cleanId = identifier.trim().toLowerCase();
    const otpHash = this.hashOtp(rawCode);
    const now = new Date();

    const record = await prisma.verificationOtp.findFirst({
      where: {
        identifier: cleanId,
        expiresAt: { gt: now }
      },
      orderBy: { createdAt: "desc" }
    });

    if (!record) {
      return {
        success: false,
        message: "Verification code has expired or does not exist. Please request a new one."
      };
    }

    if (record.attempts >= 5) {
      return {
        success: false,
        message: "Too many incorrect attempts. Please request a new verification code."
      };
    }

    if (record.otpHash !== otpHash) {
      await prisma.verificationOtp.update({
        where: { id: record.id },
        data: { attempts: { increment: 1 } }
      });

      const remaining = 5 - (record.attempts + 1);
      return {
        success: false,
        message: `Invalid verification code. ${remaining} attempts remaining.`
      };
    }

    await prisma.verificationOtp.update({
      where: { id: record.id },
      data: { verified: true }
    });

    return { success: true };
  }

  public async isVerified(identifier: string, rawCode: string): Promise<boolean> {
    const cleanId = identifier.trim().toLowerCase();
    const otpHash = this.hashOtp(rawCode);
    const now = new Date();

    const record = await prisma.verificationOtp.findFirst({
      where: {
        identifier: cleanId,
        otpHash,
        verified: true,
        expiresAt: { gt: now }
      },
      orderBy: { createdAt: "desc" }
    });

    return !!record;
  }
}

export const otpDb = new OtpDatabase();
