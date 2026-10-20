import { describe, expect, it } from "vitest";
import type { AuthUser } from "./auth";

describe("RBAC role policy baseline", () => {
  const canCreateRecharge = (role: AuthUser["role"]) =>
    ["RETAILER", "DISTRIBUTOR", "MASTER_DISTRIBUTOR", "ADMIN"].includes(role);

  it("allows operational roles to create recharge requests", () => {
    expect(canCreateRecharge("RETAILER")).toBe(true);
    expect(canCreateRecharge("DISTRIBUTOR")).toBe(true);
    expect(canCreateRecharge("MASTER_DISTRIBUTOR")).toBe(true);
    expect(canCreateRecharge("ADMIN")).toBe(true);
  });

  it("does not grant recharge initiation to API_MANAGER by default", () => {
    expect(canCreateRecharge("API_MANAGER")).toBe(false);
  });
});
