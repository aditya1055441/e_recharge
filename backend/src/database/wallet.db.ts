import { prisma } from "./prisma";

export interface DbFundingRequest {
  id: number;
  user_id: number;
  amount: string;
  status: string;
  created_at: string;
}

export class WalletDatabase {
  public async createFundingRequest(userId: number, amount: string): Promise<DbFundingRequest> {
    const req = await prisma.walletFundingRequest.create({
      data: {
        userId: BigInt(userId),
        amount: Number(amount),
        currency: "INR",
        status: "VERIFICATION_REQUIRED"
      }
    });

    return {
      id: Number(req.id),
      user_id: Number(req.userId),
      amount: req.amount.toString(),
      status: req.status,
      created_at: req.createdAt.toISOString()
    };
  }

  public async getAvailableBalance(userId: number): Promise<string> {
    const result: any = await prisma.$queryRaw`
      SELECT COALESCE(SUM(we.amount), 0.00)::text AS balance
      FROM ledger_accounts la
      LEFT JOIN wallet_entries we ON we.account_id = la.id
      WHERE la.owner_user_id = ${BigInt(userId)} AND la.account_type = 'USER_WALLET'
    `;
    return result[0]?.balance || "0.00";
  }
}

export const walletDb = new WalletDatabase();
