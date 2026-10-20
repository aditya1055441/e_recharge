import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './main-layout.component.html'
})
export class MainLayoutComponent {
  private authService = inject(AuthService);

  currentUser = this.authService.currentUser;
  role = computed(() => this.currentUser()?.role || 'USER');

  userInitials = computed(() => {
    const name = this.currentUser()?.displayName || 'User';
    return name.slice(0, 2).toUpperCase();
  });

  title = computed(() => {
    const r = this.role();
    if (r === 'ADMIN') return 'Administrator Dashboard';
    if (r === 'API_MANAGER') return 'API Routing & Provider Control';
    if (r === 'MASTER_DISTRIBUTOR') return 'Master Distributor Workspace';
    if (r === 'DISTRIBUTOR') return 'Distributor Management Console';
    return 'Retailer Point of Sale';
  });

  canAccess(roles: string[]): boolean {
    const current = this.role();
    return roles.includes(current);
  }

  logout() {
    this.authService.logout();
  }
}
