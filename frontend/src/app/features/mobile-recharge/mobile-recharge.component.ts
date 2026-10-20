import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RechargeService, RechargePlan } from '../../core/services/recharge.service';
import { PaymentModalComponent } from '../../shared/components/payment-modal/payment-modal.component';

@Component({
  selector: 'app-mobile-recharge',
  standalone: true,
  imports: [CommonModule, FormsModule, PaymentModalComponent],
  templateUrl: './mobile-recharge.component.html',
  styleUrls: ['./mobile-recharge.component.css']
})
export class MobileRechargeComponent implements OnInit {
  private rechargeService = inject(RechargeService);

  operator = 'JIO';
  circle = 'DELHI';
  mobile = '9999999999';
  amount = '299';

  plans = signal<RechargePlan[]>([]);
  plansLoading = signal(false);
  selectedCategory = signal<string>('ALL');

  loading = signal(false);
  message = signal<string | null>(null);
  error = signal<string | null>(null);
  isPaymentModalOpen = signal(false);

  ngOnInit() {
    this.loadPlans();
  }

  onOperatorOrCircleChange() {
    this.loadPlans();
  }

  loadPlans() {
    this.plansLoading.set(true);
    this.rechargeService.getMobilePlans(this.operator, this.circle).subscribe({
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

  get filteredPlans(): RechargePlan[] {
    const cat = this.selectedCategory();
    if (cat === 'ALL') {
      return this.plans();
    }
    return this.plans().filter((p) => p.category === cat);
  }

  get categories(): string[] {
    const unique = new Set(this.plans().map((p) => p.category).filter(Boolean) as string[]);
    return ['ALL', ...Array.from(unique)];
  }

  openPaymentOptions() {
    this.message.set(null);
    this.error.set(null);

    if (!this.mobile || this.mobile.length !== 10) {
      this.error.set('Please enter a valid 10-digit mobile number.');
      return;
    }

    if (!this.amount || Number(this.amount) < 10) {
      this.error.set('Please enter a valid amount (minimum ₹10).');
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
      serviceType: 'MOBILE',
      target: this.mobile,
      amount: Number(this.amount).toFixed(2),
      providerCode: 'DEMO'
    }).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.message.set(`Recharge submitted via Wallet! Ref: ${res.publicId.slice(0, 8)} (${res.status})`);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.error || 'Failed to submit mobile recharge.');
      }
    });
  }

  onCardPaymentSuccess(event: any) {
    this.loading.set(false);
    const tx = event.transaction;
    this.message.set(
      `Recharge submitted via Debit/Credit Card (Razorpay)! Ref: ${tx.publicId.slice(0, 8)} (${tx.status})`
    );
  }
}
