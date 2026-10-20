import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RechargeService, RechargePlan } from '../../core/services/recharge.service';
import { PaymentModalComponent } from '../../shared/components/payment-modal/payment-modal.component';

@Component({
  selector: 'app-dth-recharge',
  standalone: true,
  imports: [CommonModule, FormsModule, PaymentModalComponent],
  templateUrl: './dth-recharge.component.html',
  styleUrls: ['./dth-recharge.component.css']
})
export class DthRechargeComponent implements OnInit {
  private rechargeService = inject(RechargeService);

  operator = 'TATAPLAY';
  subscriberId = '1002938471';
  amount = '350';

  plans = signal<RechargePlan[]>([]);
  plansLoading = signal(false);

  loading = signal(false);
  message = signal<string | null>(null);
  error = signal<string | null>(null);
  isPaymentModalOpen = signal(false);

  ngOnInit() {
    this.loadPlans();
  }

  onOperatorChange() {
    this.loadPlans();
  }

  loadPlans() {
    this.plansLoading.set(true);
    this.rechargeService.getDthPlans(this.operator, this.subscriberId).subscribe({
      next: (res) => {
        this.plans.set(res.plans);
        this.plansLoading.set(false);
      },
      error: () => {
        this.plansLoading.set(false);
      }
    });
  }

  selectPlan(plan: RechargePlan) {
    this.amount = String(plan.amount);
  }

  openPaymentOptions() {
    this.message.set(null);
    this.error.set(null);

    if (!this.subscriberId || this.subscriberId.trim().length < 4) {
      this.error.set('Please enter a valid Subscriber ID / Customer ID.');
      return;
    }

    if (!this.amount || Number(this.amount) < 50) {
      this.error.set('Please enter a valid amount (minimum ₹50).');
      return;
    }

    this.isPaymentModalOpen.set(true);
  }

  processWalletPayment() {
    this.isPaymentModalOpen.set(false);
    this.loading.set(true);
    this.message.set(null);
    this.error.set(null);

    this.rechargeService.createTransaction({
      serviceType: 'DTH',
      target: this.subscriberId,
      amount: Number(this.amount).toFixed(2),
      providerCode: 'DEMO'
    }).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.message.set(`DTH Recharge submitted via Wallet! Ref: ${res.publicId.slice(0, 8)} (${res.status})`);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.error || 'Failed to submit DTH recharge.');
      }
    });
  }

  onCardPaymentSuccess(event: any) {
    this.loading.set(false);
    const tx = event.transaction;
    this.message.set(
      `DTH Recharge submitted via Debit/Credit Card (Razorpay)! Ref: ${tx.publicId.slice(0, 8)} (${tx.status})`
    );
  }
}
