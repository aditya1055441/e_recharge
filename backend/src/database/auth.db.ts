import { prisma } from "./prisma";
import { Role } from "../security/auth";

export interface DbUser {
  id: number;
  email: string;
  phone?: string | null;
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
      phone: user.phone,
      password_hash: user.passwordHash,
      display_name: user.displayName,
      role: user.role as Role,
      parent_user_id: user.parentUserId ? Number(user.parentUserId) : null,
      status: user.status as any,
      created_at: user.createdAt.toISOString(),
      last_login: user.lastLogin ? user.lastLogin.toISOString() : null
    };
  }

  public async findUserByPhone(phone: string): Promise<DbUser | null> {
    const user = await prisma.user.findFirst({
      where: { phone: phone.trim() }
    });

    if (!user) return null;

    return {
      id: Number(user.id),
      email: user.email,
      phone: user.phone,
      password_hash: user.passwordHash,
      display_name: user.displayName,
      role: user.role as Role,
      parent_user_id: user.parentUserId ? Number(user.parentUserId) : null,
      status: user.status as any,
      created_at: user.createdAt.toISOString(),
      last_login: user.lastLogin ? user.lastLogin.toISOString() : null
    };
  }

  public async findUserByIdentifier(identifier: string): Promise<DbUser | null> {
    const cleanId = identifier.trim().toLowerCase();
    if (cleanId.includes("@")) {
      return this.findUserByEmail(cleanId);
    }
    return this.findUserByPhone(cleanId);
  }

  public async findUserById(id: number): Promise<DbUser | null> {
    const user = await prisma.user.findUnique({
      where: { id: BigInt(id) }
    });

    if (!user) return null;

    return {
      id: Number(user.id),
      email: user.email,
      phone: user.phone,
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

  public async createRegisteredRetailer(data: {
    email: string;
    phone?: string;
    name: string;
    passwordHash: string;
  }): Promise<DbUser> {
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: data.email.toLowerCase(),
          phone: data.phone || null,
          passwordHash: data.passwordHash,
          displayName: data.name,
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
        phone: user.phone,
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

  public async createGoogleRetailer(cleanEmail: string, name: string, passwordHash: string): Promise<DbUser> {
    return this.createRegisteredRetailer({
      email: cleanEmail,
      name,
      passwordHash
    });
  }
}

export const authDb = new AuthDatabase();
