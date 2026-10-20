import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RechargeService, Provider } from '../../core/services/recharge.service';

@Component({
  selector: 'app-api-manager',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './api-manager.component.html',
  styleUrls: ['./api-manager.component.css']
})
export class ApiManagerComponent implements OnInit {
  private rechargeService = inject(RechargeService);

  providers = signal<Provider[]>([]);

  ngOnInit() {
    this.loadProviders();
  }

  loadProviders() {
    this.rechargeService.getProviders().subscribe({
      next: (res) => this.providers.set(res.providers),
      error: (err) => console.error('Failed to load providers', err)
    });
  }
}
