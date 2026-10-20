import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RechargeService } from '../../core/services/recharge.service';
import { Transaction } from '../../core/models/user.model';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './transactions.component.html',
  styleUrls: ['./transactions.component.css']
})
export class TransactionsComponent implements OnInit {
  private rechargeService = inject(RechargeService);

  transactions = signal<Transaction[]>([]);
  searchQuery = '';
  statusFilter = 'ALL';

  ngOnInit() {
    this.loadTransactions();
  }

  loadTransactions() {
    this.rechargeService.getTransactions(100).subscribe({
      next: (res) => this.transactions.set(res.transactions),
      error: (err) => console.error(err)
    });
  }

  filteredTransactions(): Transaction[] {
    const query = this.searchQuery.toLowerCase().trim();
    const status = this.statusFilter;

    return this.transactions().filter(t => {
      const matchesQuery = !query ||
        t.public_id.toLowerCase().includes(query) ||
        t.target.toLowerCase().includes(query) ||
        t.service_type.toLowerCase().includes(query);

      const matchesStatus = status === 'ALL' ||
        (status === 'PENDING' ? ['PENDING', 'PROCESSING', 'UNKNOWN'].includes(t.status) : t.status === status);

      return matchesQuery && matchesStatus;
    });
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
