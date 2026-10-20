export type ServiceType = "MOBILE" | "DTH" | "BILL_PAYMENT";
export type ProviderResultStatus = "SUCCESS" | "FAILED" | "PENDING" | "UNKNOWN";

export interface RechargeRequest {
  transactionId: string;
  serviceType: ServiceType;
  target: string;
  amount: string;
  idempotencyKey: string;
  metadata?: Record<string, unknown>;
}

export interface ProviderResponse {
  status: ProviderResultStatus;
  providerReference?: string;
  code?: string;
  message?: string;
  raw?: Record<string, unknown>;
}

export interface ProviderStatus {
  status: ProviderResultStatus;
  providerReference?: string;
  code?: string;
  message?: string;
}

export interface RechargeProvider {
  readonly code: string;
  supports(serviceType: ServiceType): boolean;
  submitRecharge(request: RechargeRequest): Promise<ProviderResponse>;
  checkStatus(providerReference: string): Promise<ProviderStatus>;
}
