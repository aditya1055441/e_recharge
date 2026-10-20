import type { RechargeProvider, RechargeRequest, ProviderResponse, ProviderStatus, ServiceType } from "./provider.types";

/**
 * LOCAL DEMO ONLY. Does not call telecom, DTH or bill-payment networks.
 * Use fixed behavior for repeatable development and tests.
 */
export class DemoProvider implements RechargeProvider {
  readonly code = "DEMO";
  supports(_serviceType: ServiceType) { return true; }

  async submitRecharge(request: RechargeRequest): Promise<ProviderResponse> {
    if (request.target === "0000000000") {
      return { status: "FAILED", code: "DEMO_REJECTED", message: "Simulated provider rejection" };
    }
    if (request.target === "1111111111") {
      return { status: "UNKNOWN", code: "DEMO_TIMEOUT", message: "Simulated ambiguous provider response" };
    }
    return {
      status: "SUCCESS",
      providerReference: `DEMO-${request.transactionId}`,
      message: "Simulated success; no real recharge performed",
      raw: { simulated: true }
    };
  }

  async checkStatus(providerReference: string): Promise<ProviderStatus> {
    return { status: "SUCCESS", providerReference, message: "Simulated status only" };
  }
}
