import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DashboardTotals, Transaction } from '../models/user.model';

export interface Provider {
  id: number;
  code: string;
  display_name: string;
  enabled: boolean;
  environment: string;
  priority: number;
  supported_services: string[];
  health_status: string;
  updated_at: string;
}

export interface RechargeRequest {
  serviceType: 'MOBILE' | 'DTH' | 'BILL_PAYMENT';
  target: string;
  amount: string;
  providerCode?: string;
}

export interface RechargeResponse {
  transactionId: number;
  publicId: string;
  status: string;
  providerCode: string;
}

export interface FundingRequestResponse {
  fundingRequest: {
    id: number;
    amount: string;
    status: string;
    created_at: string;
  };
  message: string;
}

export interface RazorpayOrderResponse {
  success: boolean;
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
}

export interface VerifyCardRechargeRequest {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  serviceType: 'MOBILE' | 'DTH' | 'BILL_PAYMENT';
  target: string;
  amount: string;
}

export interface RechargePlan {
  planId: string;
  operatorCode: string;
  serviceType: 'MOBILE_PREPAID' | 'DTH';
  amount: number;
  validity?: string;
  description?: string;
  benefits?: string[];
  category?: string;
}

@Injectable({
  providedIn: 'root'
})
export class RechargeService {
  private apiUrl = 'http://localhost:3000/api/v1';

  constructor(private http: HttpClient) {}

  getDashboard(): Observable<{ role: string; totals: DashboardTotals }> {
    return this.http.get<{ role: string; totals: DashboardTotals }>(`${this.apiUrl}/dashboard`);
  }

  getTransactions(limit: number = 50): Observable<{ transactions: Transaction[] }> {
    return this.http.get<{ transactions: Transaction[] }>(`${this.apiUrl}/transactions?limit=${limit}`);
  }

  createTransaction(data: RechargeRequest): Observable<RechargeResponse> {
    const idempotencyKey = `web-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const headers = new HttpHeaders({
      'Idempotency-Key': idempotencyKey
    });

    return this.http.post<RechargeResponse>(`${this.apiUrl}/transactions`, {
      serviceType: data.serviceType,
      target: data.target,
      amount: data.amount,
      providerCode: data.providerCode || 'DEMO'
    }, { headers });
  }

  getMobilePlans(operator: string, circle: string): Observable<{ success: boolean; plans: RechargePlan[] }> {
    return this.http.get<{ success: boolean; plans: RechargePlan[] }>(
      `${this.apiUrl}/plans/mobile?operator=${encodeURIComponent(operator)}&circle=${encodeURIComponent(circle)}`
    );
  }

  getDthPlans(operator: string, subscriberId?: string): Observable<{ success: boolean; plans: RechargePlan[] }> {
    const subParam = subscriberId ? `&subscriberId=${encodeURIComponent(subscriberId)}` : '';
    return this.http.get<{ success: boolean; plans: RechargePlan[] }>(
      `${this.apiUrl}/plans/dth?operator=${encodeURIComponent(operator)}${subParam}`
    );
  }

  createRazorpayOrder(amount: string, serviceType: string, target: string): Observable<RazorpayOrderResponse> {
    return this.http.post<RazorpayOrderResponse>(`${this.apiUrl}/payments/razorpay/create-order`, {
      amount,
      serviceType,
      target
    });
  }

  verifyCardRecharge(data: VerifyCardRechargeRequest): Observable<{ success: boolean; message: string; transaction: any }> {
    return this.http.post<{ success: boolean; message: string; transaction: any }>(
      `${this.apiUrl}/payments/razorpay/verify-recharge`,
      data
    );
  }

  getProviders(): Observable<{ providers: Provider[] }> {
    return this.http.get<{ providers: Provider[] }>(`${this.apiUrl}/providers`);
  }

  getNotifications(): Observable<{ notifications: any[] }> {
    return this.http.get<{ notifications: any[] }>(`${this.apiUrl}/notifications`);
  }

  markNotificationRead(id: number): Observable<{ success: boolean }> {
    return this.http.patch<{ success: boolean }>(`${this.apiUrl}/notifications/${id}/read`, {});
  }

  requestWalletFunding(amount: string): Observable<FundingRequestResponse> {
    return this.http.post<FundingRequestResponse>(`${this.apiUrl}/wallet/funding-requests`, { amount });
  }
}
