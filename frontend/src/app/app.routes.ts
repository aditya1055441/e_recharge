import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login.component';
import { MainLayoutComponent } from './layouts/main-layout/main-layout.component';
import { DashboardComponent } from './features/dashboards/dashboard.component';
import { MobileRechargeComponent } from './features/mobile-recharge/mobile-recharge.component';
import { DthRechargeComponent } from './features/dth-recharge/dth-recharge.component';
import { BillPaymentComponent } from './features/bill-payment/bill-payment.component';
import { TransactionsComponent } from './features/transactions/transactions.component';
import { WalletComponent } from './features/wallet/wallet.component';
import { ApiManagerComponent } from './features/api-manager/api-manager.component';
import { HierarchyComponent } from './features/hierarchy/hierarchy.component';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardComponent },
      {
        path: 'mobile-recharge',
        component: MobileRechargeComponent,
        data: { roles: ['RETAILER', 'DISTRIBUTOR', 'ADMIN'] }
      },
      {
        path: 'dth-recharge',
        component: DthRechargeComponent,
        data: { roles: ['RETAILER', 'DISTRIBUTOR', 'ADMIN'] }
      },
      {
        path: 'bill-payment',
        component: BillPaymentComponent,
        data: { roles: ['RETAILER', 'DISTRIBUTOR', 'ADMIN'] }
      },
      { path: 'transactions', component: TransactionsComponent },
      { path: 'wallet', component: WalletComponent },
      {
        path: 'api-manager',
        component: ApiManagerComponent,
        data: { roles: ['ADMIN', 'API_MANAGER'] }
      },
      {
        path: 'hierarchy',
        component: HierarchyComponent,
        data: { roles: ['ADMIN', 'MASTER_DISTRIBUTOR', 'DISTRIBUTOR'] }
      }
    ]
  },
  { path: '**', redirectTo: 'dashboard' }
];
