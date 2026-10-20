import { prisma } from "./prisma";
import { Role } from "../security/auth";

export interface DbUser {
  id: number;
  email: string;
  password_hash: string;
  display_name: string;
  role: Role;
  parent_user_id: number | null;
  status: "ACTIVE" | "SUSPENDED" | "PENDING";
  created_at: string;

  last_login: string | null;
}

export class AuthDatabase {
  public async findUserByEmail(email: string): Promise<DbUser | null> {
    const user = await prisma.user.findFirst({
      where: {
        email: {
          equals: email,
          mode: "insensitive"
        }
      }
    });

    if (!user) return null;

    return {
      id: Number(user.id),
      email: user.email,
      password_hash: user.passwordHash,
      display_name: user.displayName,
      role: user.role as Role,
      parent_user_id: user.parentUserId ? Number(user.parentUserId) : null,
      status: user.status as any,
      created_at: user.createdAt.toISOString(),
      last_login: user.lastLogin ? user.lastLogin.toISOString() : null
    };
  }

  public async findUserById(id: number): Promise<DbUser | null> {
    const user = await prisma.user.findUnique({
      where: { id: BigInt(id) }
    });

    if (!user) return null;

    return {
      id: Number(user.id),
      email: user.email,
      password_hash: user.passwordHash,
      display_name: user.displayName,
      role: user.role as Role,
      parent_user_id: user.parentUserId ? Number(user.parentUserId) : null,
      status: user.status as any,
      created_at: user.createdAt.toISOString(),
      last_login: user.lastLogin ? user.lastLogin.toISOString() : null
    };
  }

  public async updateLastLogin(userId: number): Promise<Date> {
    const updated = await prisma.user.update({
      where: { id: BigInt(userId) },
      data: { lastLogin: new Date() },
      select: { lastLogin: true }
    });
    return updated.lastLogin!;
  }

  public async createGoogleRetailer(cleanEmail: string, name: string, passwordHash: string): Promise<DbUser> {
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: cleanEmail,
          passwordHash,
          displayName: name,
          role: "RETAILER",
          status: "ACTIVE",
          lastLogin: new Date()
        }
      });

      let ledger = await tx.ledgerAccount.findFirst({
        where: {
          ownerUserId: user.id,
          accountType: "USER_WALLET",
          currency: "INR"
        }
      });

      if (!ledger) {
        ledger = await tx.ledgerAccount.create({
          data: {
            ownerUserId: user.id,
            accountType: "USER_WALLET",
            currency: "INR"
          }
        });
      }

      await tx.walletAccount.upsert({
        where: {
          ownerUserId_currency: {
            ownerUserId: user.id,
            currency: "INR"
          }
        },
        create: {
          ownerUserId: user.id,
          ledgerAccountId: ledger.id,
          currency: "INR",
          status: "ACTIVE"
        },
        update: {}
      });

      return {
        id: Number(user.id),
        email: user.email,
        password_hash: user.passwordHash,
        display_name: user.displayName,
        role: user.role as Role,
        parent_user_id: user.parentUserId ? Number(user.parentUserId) : null,
        status: user.status as any,
        created_at: user.createdAt.toISOString(),
        last_login: user.lastLogin ? user.lastLogin.toISOString() : null
      };
    });
  }
}

export const authDb = new AuthDatabase();
