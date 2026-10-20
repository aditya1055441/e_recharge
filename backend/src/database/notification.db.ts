import { prisma } from "./prisma";

export interface DbNotification {
  id: number;
  type: string;
  message: string;
  transaction_id: number | null;
  created_at: string;
  read_at: string | null;
}

export class NotificationDatabase {
  public async getUserNotifications(userId: number, limit: number = 100): Promise<DbNotification[]> {
    const notifications = await prisma.notification.findMany({
      where: { userId: BigInt(userId) },
      orderBy: { createdAt: "desc" },
      take: limit
    });

    return notifications.map((n) => ({
      id: Number(n.id),
      type: n.type,
      message: n.message,
      transaction_id: n.transactionId ? Number(n.transactionId) : null,
      created_at: n.createdAt.toISOString(),
      read_at: n.readAt ? n.readAt.toISOString() : null
    }));
  }

  public async markAsRead(id: number, userId: number): Promise<boolean> {
    const res = await prisma.notification.updateMany({
      where: {
        id: BigInt(id),
        userId: BigInt(userId)
      },
      data: {
        readAt: new Date()
      }
    });

    return res.count > 0;
  }
}

export const notificationDb = new NotificationDatabase();
