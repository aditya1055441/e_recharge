import { prisma } from "./prisma";

export class AdminDatabase {
  public async getUserById(targetId: number) {
    const user = await prisma.user.findUnique({
      where: { id: BigInt(targetId) },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        parentUserId: true,
        status: true,
        createdAt: true
      }
    });

    if (!user) return null;

    return {
      id: Number(user.id),
      email: user.email,
      display_name: user.displayName,
      role: user.role,
      parent_user_id: user.parentUserId ? Number(user.parentUserId) : null,
      status: user.status,
      created_at: user.createdAt.toISOString()
    };
  }

  public async getSubordinateUsers(actorId: number, role: string) {
    if (role === "ADMIN") {
      const users = await prisma.user.findMany({
        take: 100,
        orderBy: { id: "asc" },
        select: {
          id: true,
          email: true,
          displayName: true,
          role: true,
          parentUserId: true,
          status: true,
          createdAt: true
        }
      });
      return users.map((u) => ({
        id: Number(u.id),
        email: u.email,
        display_name: u.displayName,
        role: u.role,
        parent_user_id: u.parentUserId ? Number(u.parentUserId) : null,
        status: u.status,
        created_at: u.createdAt.toISOString()
      }));
    }

    const users: any = await prisma.$queryRaw`
      WITH RECURSIVE descendants AS (
        SELECT id FROM users WHERE parent_user_id = ${BigInt(actorId)}
        UNION ALL
        SELECT u.id FROM users u JOIN descendants d ON u.parent_user_id = d.id
      )
      SELECT id, email, display_name, role, parent_user_id, status, created_at
      FROM users
      WHERE id IN (SELECT id FROM descendants)
      ORDER BY id ASC LIMIT 100
    `;

    return users.map((u: any) => ({
      id: Number(u.id),
      email: u.email,
      display_name: u.display_name,
      role: u.role,
      parent_user_id: u.parent_user_id ? Number(u.parent_user_id) : null,
      status: u.status,
      created_at: u.created_at
    }));
  }

  public async getSystemAuditMetrics() {
    const usersByRole = await prisma.user.groupBy({
      by: ["role"],
      _count: {
        id: true
      }
    });

    const activeProviders = await prisma.provider.count({
      where: { enabled: true }
    });

    const totalTransactions = await prisma.rechargeTransaction.count();

    return {
      usersByRole: usersByRole.map((r) => ({ role: r.role, count: r._count.id })),
      activeProviders,
      totalTransactions,
      timestamp: new Date().toISOString()
    };
  }
}

export const adminDb = new AdminDatabase();
