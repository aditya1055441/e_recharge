import { Component, Input, Output, EventEmitter, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RechargeService } from '../../../core/services/recharge.service';
import { AuthService } from '../../../core/services/auth.service';

declare var Razorpay: any;

@Component({
  selector: 'app-payment-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './payment-modal.component.html',
  styleUrls: ['./payment-modal.component.css']
})
export class PaymentModalComponent {
  private rechargeService = inject(RechargeService);
  private authService = inject(AuthService);

  @Input() isOpen = false;
  @Input() serviceType: 'MOBILE' | 'DTH' | 'BILL_PAYMENT' = 'MOBILE';
  @Input() target = '';
  @Input() amount = '';
  @Input() operatorName = '';

  @Output() walletPay = new EventEmitter<void>();
  @Output() cardPaySuccess = new EventEmitter<any>();
  @Output() close = new EventEmitter<void>();

  selectedMethod: 'WALLET' | 'CARD' = 'WALLET';
  loading = signal(false);
  error = signal<string | null>(null);

  closeModal() {
    this.error.set(null);
    this.loading.set(false);
    this.close.emit();
  }

  onBackdropClick(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.closeModal();
    }
  }

  confirmPayment() {
    if (this.selectedMethod === 'WALLET') {
      this.walletPay.emit();
    } else {
      this.initiateRazorpayPayment();
    }
  }

  initiateRazorpayPayment() {
    this.loading.set(true);
    this.error.set(null);

    this.rechargeService.createRazorpayOrder(
      Number(this.amount).toFixed(2),
      this.serviceType,
      this.target
    ).subscribe({
      next: (orderRes) => {
        this.launchRazorpayCheckout(orderRes);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.error || 'Failed to initialize card payment');
      }
    });
  }

  launchRazorpayCheckout(orderRes: any) {
    const user = this.authService.currentUser();
    const options = {
      key: orderRes.keyId,
      amount: orderRes.amount,
      currency: orderRes.currency || 'INR',
      name: 'RechargeOS Portal',
      description: `${this.serviceType} Recharge for ${this.target}`,
      order_id: orderRes.orderId,
      prefill: {
        name: user?.displayName || 'Customer',
        email: user?.email || 'customer@example.com'
      },
      theme: {
        color: '#0c66e4'
      },
      handler: (response: any) => {
        this.rechargeService.verifyCardRecharge({
          razorpayOrderId: response.razorpay_order_id,
          razorpayPaymentId: response.razorpay_payment_id,
          razorpaySignature: response.razorpay_signature || 'simulated_sig',
          serviceType: this.serviceType,
          target: this.target,
          amount: Number(this.amount).toFixed(2)
        }).subscribe({
          next: (res) => {
            this.loading.set(false);
            this.cardPaySuccess.emit(res);
            this.closeModal();
          },
          error: (verifyErr) => {
            this.loading.set(false);
            this.error.set(verifyErr.error?.error || 'Payment signature verification failed.');
          }
        });
      },
      modal: {
        ondismiss: () => {
          this.loading.set(false);
        }
      }
    };

    try {
      if (typeof Razorpay !== 'undefined') {
        const rzp = new Razorpay(options);
        rzp.on('payment.failed', (resp: any) => {
          this.loading.set(false);
          this.error.set(resp.error?.description || 'Card payment was declined.');
        });
        rzp.open();
      } else {
        this.simulateSandboxCardPayment(orderRes.orderId);
      }
    } catch {
      this.simulateSandboxCardPayment(orderRes.orderId);
    }
  }

  simulateSandboxCardPayment(rzpOrderId: string) {
    const confirmed = confirm(
      `[Razorpay Card Gateway Sandbox]\nAmount: ₹${this.amount}\nService: ${this.serviceType}\nOrder ID: ${rzpOrderId}\n\nClick OK to simulate successful Debit/Credit Card payment, or Cancel to abort.`
    );

    if (confirmed) {
      this.rechargeService.verifyCardRecharge({
        razorpayOrderId: rzpOrderId,
        razorpayPaymentId: 'pay_simulated_' + Date.now(),
        razorpaySignature: 'simulated_sig',
        serviceType: this.serviceType,
        target: this.target,
        amount: Number(this.amount).toFixed(2)
      }).subscribe({
        next: (res) => {
          this.loading.set(false);
          this.cardPaySuccess.emit(res);
          this.closeModal();
        },
        error: (verifyErr) => {
          this.loading.set(false);
          this.error.set(verifyErr.error?.error || 'Card payment verification failed.');
        }
      });
    } else {
      this.loading.set(false);
    }
  }
}
