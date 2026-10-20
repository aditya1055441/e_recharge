import { describe, expect, it } from "vitest";
import { DemoProvider } from "./demo.provider";

describe("DemoProvider", () => {
  const provider = new DemoProvider();
  const request = (target: string) => ({
    transactionId: "test-1", serviceType: "MOBILE" as const,
    target, amount: "10.00", idempotencyKey: "test-key-0001"
  });

  it("returns simulated success for normal target", async () => {
    const result = await provider.submitRecharge(request("9999999999"));
    expect(result.status).toBe("SUCCESS");
    expect(result.raw?.simulated).toBe(true);
  });

  it("returns failed for demo failure target", async () => {
    const result = await provider.submitRecharge(request("0000000000"));
    expect(result.status).toBe("FAILED");
  });

  it("returns unknown for ambiguous outcome target", async () => {
    const result = await provider.submitRecharge(request("1111111111"));
    expect(result.status).toBe("UNKNOWN");
  });
});
