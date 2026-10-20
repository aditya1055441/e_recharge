import { prisma } from "./prisma";

export interface DashboardTotals {
  total: number;
  successful: number;
  pending: number;
  failed: number;
}

export class DashboardDatabase {
  public async getTotals(userId: number, role: string): Promise<DashboardTotals> {
    if (role === "ADMIN" || role === "API_MANAGER") {
      const total = await prisma.rechargeTransaction.count();
      const successful = await prisma.rechargeTransaction.count({ where: { status: "SUCCESS" } });
      const pending = await prisma.rechargeTransaction.count({
        where: { status: { in: ["PENDING", "PROCESSING", "UNKNOWN"] } }
      });
      const failed = await prisma.rechargeTransaction.count({ where: { status: "FAILED" } });

      return { total, successful, pending, failed };
    }

    const totals: any = await prisma.$queryRaw`
      WITH RECURSIVE descendants AS (
        SELECT id FROM users WHERE id = ${BigInt(userId)}
        UNION ALL
        SELECT u.id FROM users u JOIN descendants d ON u.parent_user_id = d.id
      )
      SELECT COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'SUCCESS')::int AS successful,
        COUNT(*) FILTER (WHERE status IN ('PENDING', 'PROCESSING', 'UNKNOWN'))::int AS pending,
        COUNT(*) FILTER (WHERE status = 'FAILED')::int AS failed
      FROM recharge_transactions
      WHERE client_user_id IN (SELECT id FROM descendants)
    `;

    return totals[0] || { total: 0, successful: 0, pending: 0, failed: 0 };
  }
}

export const dashboardDb = new DashboardDatabase();
