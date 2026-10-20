import { prisma } from "./prisma";

export interface CreateCardRechargeParams {
  userId: number;
  serviceType: string;
  target: string;
  amount: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  idempotencyKey: string;
}

export class PaymentDatabase {
  public async findPriorTransaction(userId: number, idempotencyKey: string) {
    const prior = await prisma.rechargeTransaction.findFirst({
      where: {
        clientUserId: BigInt(userId),
        idempotencyKey
      }
    });

    if (!prior) return null;

    return {
      publicId: prior.publicId,
      status: prior.status,
      duplicate: true
    };
  }

  public async createCardRechargeRecord(params: CreateCardRechargeParams) {
    const tx = await prisma.rechargeTransaction.create({
      data: {
        clientUserId: BigInt(params.userId),
        serviceType: params.serviceType,
        target: params.target,
        amount: Number(params.amount),
        currency: "INR",
        idempotencyKey: params.idempotencyKey,
        status: "PROCESSING",
        providerReference: params.razorpayPaymentId,
        requestJson: {
          serviceType: params.serviceType,
          target: params.target,
          amount: params.amount,
          paymentMethod: "CARD",
          razorpayOrderId: params.razorpayOrderId,
          razorpayPaymentId: params.razorpayPaymentId
        }
      }
    });

    return {
      id: Number(tx.id),
      publicId: tx.publicId
    };
  }

  public async updateTransactionOutcome(
    id: number,
    status: string,
    failureCode?: string | null,
    failureMessage?: string | null,
    responseJson?: any
  ) {
    return prisma.rechargeTransaction.update({
      where: { id: BigInt(id) },
      data: {
        status,
        failureCode: failureCode || null,
        failureMessage: failureMessage || null,
        responseJson: responseJson || {},
        updatedAt: new Date()
      }
    });
  }

  public async createNotification(userId: number, status: string, message: string, txId: number) {
    return prisma.notification.create({
      data: {
        userId: BigInt(userId),
        type: status,
        message,
        transactionId: BigInt(txId)
      }
    });
  }
}

export const paymentDb = new PaymentDatabase();
