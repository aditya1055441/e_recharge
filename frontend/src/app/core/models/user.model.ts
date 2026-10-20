export type Role = 'ADMIN' | 'API_MANAGER' | 'MASTER_DISTRIBUTOR' | 'DISTRIBUTOR' | 'RETAILER';

export interface User {
  id: number;
  email: string;
  role: Role;
  displayName: string;
  parentUserId: number | null;
  lastLogin?: string;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface Transaction {
  public_id: string;
  service_type: 'MOBILE' | 'DTH' | 'BILL_PAYMENT';
  target: string;
  amount: string;
  status: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'UNKNOWN' | 'REVERSED';
  created_at: string;
}

export interface DashboardTotals {
  total: number;
  successful: number;
  pending: number;
  failed: number;
}
