import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { RechargeService } from '../../core/services/recharge.service';
import { DashboardTotals, Transaction } from '../../core/models/user.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  private rechargeService = inject(RechargeService);

  totals = signal<DashboardTotals | null>(null);
  transactions = signal<Transaction[]>([]);

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.rechargeService.getDashboard().subscribe({
      next: (res) => this.totals.set(res.totals),
      error: (err) => console.error(err)
    });

    this.rechargeService.getTransactions(10).subscribe({
      next: (res) => this.transactions.set(res.transactions),
      error: (err) => console.error(err)
    });
  }

  successRate(): string {
    const t = this.totals();
    if (!t || !t.total || t.total === 0) return '100.0';
    return ((t.successful / t.total) * 100).toFixed(1);
  }

  statusClass(status: string): string {
    switch (status) {
      case 'SUCCESS': return 'status-success';
      case 'FAILED': return 'status-failed';
      case 'PENDING':
      case 'PROCESSING':
      case 'UNKNOWN': return 'status-pending';
      default: return '';
    }
  }
}
