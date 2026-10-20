import { RechargePlan, RechargeProvider } from "./recharge-provider";
import { neropayProvider } from "./neropay.provider";

export class SelectedProvider implements RechargeProvider {
  private delegate: RechargeProvider = neropayProvider;

  async getMobilePlans(operatorCode: string, circleCode: string = "DELHI"): Promise<RechargePlan[]> {
    return this.delegate.getMobilePlans(operatorCode, circleCode);
  }

  async getDthPlans(operatorCode: string, subscriberId?: string): Promise<RechargePlan[]> {
    return this.delegate.getDthPlans(operatorCode, subscriberId);
  }
}

export const selectedProvider = new SelectedProvider();
