export type RechargePlan = {
  planId: string;
  operatorCode: string;
  serviceType: "MOBILE_PREPAID" | "DTH";
  amount: number;
  validity?: string;
  description?: string;
  benefits?: string[];
  category?: string;
};

export interface RechargeProvider {
  getMobilePlans(
    operatorCode: string,
    circleCode: string
  ): Promise<RechargePlan[]>;

  getDthPlans(
    operatorCode: string,
    subscriberId?: string
  ): Promise<RechargePlan[]>;
}
