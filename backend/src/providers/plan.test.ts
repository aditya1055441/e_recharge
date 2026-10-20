import { describe, expect, it } from "vitest";
import { selectedProvider } from "./selected-provider";

describe("Neropay Operator Plans Provider", () => {
  it("fetches mobile plans for Jio with operator codes and amounts", async () => {
    const plans = await selectedProvider.getMobilePlans("JIO", "DELHI");

    expect(Array.isArray(plans)).toBe(true);
    expect(plans.length).toBeGreaterThan(0);

    const plan299 = plans.find((p) => p.amount === 299);
    expect(plan299).toBeDefined();
    expect(plan299?.serviceType).toBe("MOBILE_PREPAID");
    expect(plan299?.validity).toBeDefined();
    expect(plan299?.benefits?.length).toBeGreaterThan(0);
  });

  it("fetches DTH plans for Tata Play with packages and bouquets", async () => {
    const plans = await selectedProvider.getDthPlans("TATAPLAY");

    expect(Array.isArray(plans)).toBe(true);
    expect(plans.length).toBeGreaterThan(0);

    const plan350 = plans.find((p) => p.amount === 350);
    expect(plan350).toBeDefined();
    expect(plan350?.serviceType).toBe("DTH");
    expect(plan350?.validity).toBe("1 Month");
  });
});
