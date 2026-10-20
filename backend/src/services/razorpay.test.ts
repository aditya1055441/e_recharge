import { describe, expect, it } from "vitest";
import { razorpayService } from "./razorpay.service";

describe("Razorpay Service", () => {
  it("creates a mock order with formatted amounts and unique ID", async () => {
    const order = await razorpayService.createOrder({
      amount: 299,
      receipt: "rcpt_test_001"
    });

    expect(order.id).toBeDefined();
    expect(order.id.startsWith("order_rzp_mock_")).toBe(true);
    expect(order.amount).toBe(29900);
    expect(order.currency).toBe("INR");
    expect(order.status).toBe("created");
  });

  it("verifies payment signature for mock order IDs", () => {
    const isValid = razorpayService.verifyPaymentSignature({
      razorpayOrderId: "order_rzp_mock_12345",
      razorpayPaymentId: "pay_test_001",
      razorpaySignature: "mock_signature"
    });

    expect(isValid).toBe(true);
  });
});
