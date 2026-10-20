import { prisma } from "./prisma";

export interface DbTransaction {
  public_id: string;
  service_type: string;
  target: string;
  amount: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export class TransactionDatabase {
  public async getVisibleTransactions(
    userId: number,
    role: string,
    limit: number = 50
  ): Promise<DbTransaction[]> {
    if (role === "ADMIN") {
      const txs = await prisma.rechargeTransaction.findMany({
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          publicId: true,
          serviceType: true,
          target: true,
          amount: true,
          status: true,
          createdAt: true,
          updatedAt: true
        }
      });

      return txs.map((t) => ({
        public_id: t.publicId,
        service_type: t.serviceType,
        target: t.target,
        amount: t.amount.toString(),
        status: t.status,
        created_at: t.createdAt.toISOString(),
        updated_at: t.updatedAt.toISOString()
      }));
    }

    const txs: any = await prisma.$queryRaw`
      WITH RECURSIVE visible_users AS (
        SELECT id FROM users WHERE id = ${BigInt(userId)}
        UNION ALL
        SELECT u.id FROM users u JOIN visible_users v ON u.parent_user_id = v.id
      )
      SELECT t.public_id, t.service_type, t.target, t.amount, t.status, t.created_at, t.updated_at
      FROM recharge_transactions t
      WHERE t.client_user_id IN (SELECT id FROM visible_users)
      ORDER BY t.created_at DESC LIMIT ${limit}
    `;

    return txs.map((t: any) => ({
      public_id: t.public_id,
      service_type: t.service_type,
      target: t.target,
      amount: t.amount.toString(),
      status: t.status,
      created_at: t.created_at,
      updated_at: t.updated_at
    }));
  }
}

export const transactionDb = new TransactionDatabase();
