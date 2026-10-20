import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { razorpayService } from "../services/razorpay.service";
import { paymentDb } from "../database/payment.db";
import { DemoProvider } from "../providers/demo.provider";

const demoProvider = new DemoProvider();

export const getRazorpayConfig = async (_req: Request, res: Response) => {
  return res.json({
    success: true,
    keyId: razorpayService.getKeyId()
  });
};

export const createRazorpayOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = z.object({
      amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
      serviceType: z.enum(["MOBILE", "DTH", "BILL_PAYMENT"]),
      target: z.string().trim().min(2).max(160)
    }).safeParse(req.body);

    if (!parsed.success || Number(parsed.data.amount) <= 0 || Number(parsed.data.amount) > 100000) {
      return res.status(400).json({ error: "INVALID_AMOUNT_OR_DETAILS" });
    }

    const userId = req.authUser!.id;
    const receipt = `rc_${userId}_${Date.now()}`.slice(0, 40);

    const order = await razorpayService.createOrder({
      amount: Number(parsed.data.amount),
      receipt,
      notes: {
        userId: String(userId),
        serviceType: parsed.data.serviceType,
        target: parsed.data.target
      }
    });

    return res.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: razorpayService.getKeyId()
    });
  } catch (err: any) {
    next(err);
  }
};

export const verifyAndProcessCardRecharge = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = z.object({
      razorpayOrderId: z.string().min(1),
      razorpayPaymentId: z.string().min(1),
      razorpaySignature: z.string().min(1),
      serviceType: z.enum(["MOBILE", "DTH", "BILL_PAYMENT"]),
      target: z.string().trim().min(2).max(160),
      amount: z.string().regex(/^\d+(\.\d{1,2})?$/)
    }).safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({ error: "INVALID_PAYMENT_DATA" });
    }

    const isValidSignature = razorpayService.verifyPaymentSignature({
      razorpayOrderId: parsed.data.razorpayOrderId,
      razorpayPaymentId: parsed.data.razorpayPaymentId,
      razorpaySignature: parsed.data.razorpaySignature
    });

    if (!isValidSignature) {
      return res.status(400).json({ error: "PAYMENT_SIGNATURE_VERIFICATION_FAILED" });
    }

    const userId = req.authUser!.id;
    const idempotencyKey = req.header("Idempotency-Key") || `card-${parsed.data.razorpayPaymentId}`;

    const prior = await paymentDb.findPriorTransaction(userId, idempotencyKey);
    if (prior) {
      return res.json({ success: true, transaction: prior });
    }

    const { id, publicId } = await paymentDb.createCardRechargeRecord({
      userId,
      serviceType: parsed.data.serviceType,
      target: parsed.data.target,
      amount: parsed.data.amount,
      razorpayOrderId: parsed.data.razorpayOrderId,
      razorpayPaymentId: parsed.data.razorpayPaymentId,
      idempotencyKey
    });

    try {
      const response = await demoProvider.submitRecharge({
        transactionId: publicId,
        serviceType: parsed.data.serviceType as any,
        target: parsed.data.target,
        amount: parsed.data.amount,
        idempotencyKey
      });

      const status = response.status === "SUCCESS" ? "SUCCESS"
        : response.status === "FAILED" ? "FAILED"
        : response.status === "PENDING" ? "PROCESSING" : "UNKNOWN";

      await paymentDb.updateTransactionOutcome(
        id,
        status,
        response.status === "FAILED" ? response.code ?? "PROVIDER_FAILED" : null,
        response.message ?? null,
        response.raw ?? {}
      );

      await paymentDb.createNotification(
        userId,
        status,
        `Card Recharge ${publicId.slice(0, 8)} (${parsed.data.serviceType}): ${status}`,
        id
      );

      return res.json({
        success: true,
        message: "Payment processed via Card and recharge submitted",
        transaction: {
          publicId,
          status,
          duplicate: false
        }
      });
    } catch (providerError: any) {
      await paymentDb.updateTransactionOutcome(
        id,
        "UNKNOWN",
        "PROVIDER_EXCEPTION",
        providerError.message || "Provider error"
      );

      return res.json({
        success: true,
        message: "Card payment captured; recharge outcome requires reconciliation",
        transaction: {
          publicId,
          status: "UNKNOWN",
          duplicate: false
        }
      });
    }
  } catch (err: any) {
    next(err);
  }
};
