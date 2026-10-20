import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RechargeService } from '../../core/services/recharge.service';

@Component({
  selector: 'app-wallet',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './wallet.component.html',
  styleUrls: ['./wallet.component.css']
})
export class WalletComponent {
  private rechargeService = inject(RechargeService);

  amount = '5000.00';
  loading = signal(false);
  message = signal<string | null>(null);
  error = signal<string | null>(null);

  submitFundingRequest() {
    this.loading.set(true);
    this.message.set(null);
    this.error.set(null);

    this.rechargeService.requestWalletFunding(Number(this.amount).toFixed(2)).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.message.set(`${res.message} (Request ID: #${res.fundingRequest.id})`);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.error || 'Failed to submit funding request.');
      }
    });
  }
}
