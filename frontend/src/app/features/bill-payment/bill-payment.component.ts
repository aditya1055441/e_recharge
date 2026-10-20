import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RechargeService } from '../../core/services/recharge.service';
import { PaymentModalComponent } from '../../shared/components/payment-modal/payment-modal.component';

@Component({
  selector: 'app-bill-payment',
  standalone: true,
  imports: [CommonModule, FormsModule, PaymentModalComponent],
  templateUrl: './bill-payment.component.html',
  styleUrls: ['./bill-payment.component.css']
})
export class BillPaymentComponent {
  private rechargeService = inject(RechargeService);

  category = 'ELECTRICITY';
  biller = 'BSES_RAJDHANI';
  consumerNo = '1009827364';
  amount = '840.00';

  loading = signal(false);
  message = signal<string | null>(null);
  error = signal<string | null>(null);
  isPaymentModalOpen = signal(false);

  openPaymentOptions() {
    this.message.set(null);
    this.error.set(null);

    if (!this.consumerNo || this.consumerNo.trim().length < 4) {
      this.error.set('Please enter a valid Consumer Number / CA Number.');
      return;
    }

    if (!this.amount || Number(this.amount) < 1) {
      this.error.set('Please enter a valid bill amount.');
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
      serviceType: 'BILL_PAYMENT',
      target: `${this.biller}-${this.consumerNo}`,
      amount: Number(this.amount).toFixed(2),
      providerCode: 'DEMO'
    }).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.message.set(`Bill Payment submitted via Wallet! Ref: ${res.publicId.slice(0, 8)} (${res.status})`);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.error || 'Failed to submit bill payment.');
      }
    });
  }

  onCardPaymentSuccess(event: any) {
    this.loading.set(false);
    const tx = event.transaction;
    this.message.set(
      `Bill Payment submitted via Debit/Credit Card (Razorpay)! Ref: ${tx.publicId.slice(0, 8)} (${tx.status})`
    );
  }
}
